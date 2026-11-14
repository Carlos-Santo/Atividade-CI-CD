import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { Task } from '../../src/tasks/task.model';
import { TaskRepository } from '../../src/tasks/task.repository';

const task: Task = {
  id: 1,
  title: 'Configurar CI',
  description: null,
  status: 'pendente',
  createdAt: '2026-11-13T12:00:00.000Z',
  updatedAt: '2026-11-13T12:00:00.000Z',
};

/** Repositório simulado (mock): as rotas são testadas sem banco de dados. */
function mockRepository(): { [K in keyof TaskRepository]: ReturnType<typeof vi.fn> } {
  return {
    list: vi.fn().mockResolvedValue([task]),
    findById: vi.fn().mockResolvedValue(task),
    create: vi.fn().mockResolvedValue(task),
    update: vi.fn().mockResolvedValue(task),
    remove: vi.fn().mockResolvedValue(true),
  };
}

describe('rotas da API (unitário, com mocks)', () => {
  let repository: ReturnType<typeof mockRepository>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    repository = mockRepository();
    app = createApp({ taskRepository: repository as unknown as TaskRepository });
  });

  it('GET /health responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health responde 503 quando o banco está fora', async () => {
    const down = createApp({
      taskRepository: repository as unknown as TaskRepository,
      checkDatabase: () => Promise.reject(new Error('sem conexão')),
    });
    const res = await request(down).get('/health');
    expect(res.status).toBe(503);
  });

  it('GET /api/tasks lista as tarefas e repassa o filtro', async () => {
    const res = await request(app).get('/api/tasks?status=pendente');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([task]);
    expect(repository.list).toHaveBeenCalledWith('pendente');
  });

  it('GET /api/tasks rejeita filtro inválido', async () => {
    const res = await request(app).get('/api/tasks?status=xyz');
    expect(res.status).toBe(400);
  });

  it('GET /api/tasks/:id devolve 404 quando não encontra', async () => {
    repository.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/tasks/7');
    expect(res.status).toBe(404);
  });

  it('GET /api/tasks/:id valida o id', async () => {
    const res = await request(app).get('/api/tasks/abc');
    expect(res.status).toBe(400);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('POST /api/tasks cria e devolve 201 com Location', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Configurar CI' });
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe('/api/tasks/1');
    expect(repository.create).toHaveBeenCalledWith({
      title: 'Configurar CI',
      description: null,
      status: 'pendente',
    });
  });

  it('POST /api/tasks devolve 400 para dados inválidos', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveLength(1);
  });

  it('POST /api/tasks devolve 400 para JSON malformado', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title":');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON inválido');
  });

  it('PUT /api/tasks/:id atualiza ou devolve 404', async () => {
    expect((await request(app).put('/api/tasks/1').send({ status: 'concluida' })).status).toBe(200);
    repository.update.mockResolvedValue(null);
    expect((await request(app).put('/api/tasks/1').send({ status: 'concluida' })).status).toBe(404);
  });

  it('DELETE /api/tasks/:id devolve 204 ou 404', async () => {
    expect((await request(app).delete('/api/tasks/1')).status).toBe(204);
    repository.remove.mockResolvedValue(false);
    expect((await request(app).delete('/api/tasks/1')).status).toBe(404);
  });

  it('erros inesperados viram 500 sem vazar detalhes', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    repository.list.mockRejectedValue(new Error('falha interna'));
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro interno do servidor' });
    spy.mockRestore();
  });

  it('rota desconhecida devolve 404 e cabeçalhos de segurança', async () => {
    const res = await request(app).get('/nao-existe');
    expect(res.status).toBe(404);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
