import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { createPool, migrate } from '../../src/db';
import { PgTaskRepository } from '../../src/tasks/task.repository';

/**
 * Testes de integração: a API é exercitada de ponta a ponta contra um
 * PostgreSQL real (no CI, o container definido em `services` do workflow).
 */
describe('API de tarefas + PostgreSQL (integração)', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pool = createPool();
    await migrate(pool);
    app = createApp({
      taskRepository: new PgTaskRepository(pool),
      checkDatabase: async () => {
        await pool.query('SELECT 1');
      },
    });
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE tasks RESTART IDENTITY');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('GET /health confirma a conexão com o banco', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('executa o CRUD completo persistindo no banco', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .send({ title: 'Escrever relatório', description: 'atividade de CI' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: 1, status: 'pendente' });

    const { rows } = await pool.query('SELECT title FROM tasks WHERE id = $1', [1]);
    expect(rows[0].title).toBe('Escrever relatório');

    const updated = await request(app).put('/api/tasks/1').send({ status: 'concluida' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      title: 'Escrever relatório',
      description: 'atividade de CI',
      status: 'concluida',
    });

    const fetched = await request(app).get('/api/tasks/1');
    expect(fetched.body.status).toBe('concluida');

    expect((await request(app).delete('/api/tasks/1')).status).toBe(204);
    expect((await request(app).get('/api/tasks/1')).status).toBe(404);
  });

  it('filtra a listagem por status', async () => {
    await request(app).post('/api/tasks').send({ title: 'A' });
    await request(app).post('/api/tasks').send({ title: 'B', status: 'em_andamento' });
    await request(app).post('/api/tasks').send({ title: 'C', status: 'em_andamento' });

    const all = await request(app).get('/api/tasks');
    expect(all.body.map((t: { title: string }) => t.title)).toEqual(['A', 'B', 'C']);

    const doing = await request(app).get('/api/tasks?status=em_andamento');
    expect(doing.body).toHaveLength(2);
  });

  it('limpa a descrição quando recebe null', async () => {
    await request(app).post('/api/tasks').send({ title: 'A', description: 'temporária' });
    const res = await request(app).put('/api/tasks/1').send({ description: null });
    expect(res.body.description).toBeNull();
  });

  it('o banco recusa status fora do domínio (CHECK constraint)', async () => {
    await expect(
      pool.query("INSERT INTO tasks (title, status) VALUES ('x', 'invalido')"),
    ).rejects.toThrow(/check constraint/);
  });

  it('não é afetado por tentativa de SQL injection', async () => {
    const title = "x'); DROP TABLE tasks; --";
    const res = await request(app).post('/api/tasks').send({ title });
    expect(res.status).toBe(201);
    const list = await request(app).get('/api/tasks');
    expect(list.body[0].title).toBe(title);
  });
});
