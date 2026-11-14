import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PgTaskRepository, TaskRow, toTask } from '../../src/tasks/task.repository';

const row: TaskRow = {
  id: 1,
  title: 'Configurar CI',
  description: null,
  status: 'pendente',
  created_at: new Date('2026-11-13T12:00:00.000Z'),
  updated_at: new Date('2026-11-13T12:30:00.000Z'),
};

/** Cria um Pool falso: nenhuma conexão real com o banco é aberta. */
function mockPool(result: { rows?: TaskRow[]; rowCount?: number }) {
  const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0, ...result });
  return { pool: { query } as unknown as Pool, query };
}

describe('toTask', () => {
  it('converte a linha do banco para o formato da API', () => {
    expect(toTask(row)).toEqual({
      id: 1,
      title: 'Configurar CI',
      description: null,
      status: 'pendente',
      createdAt: '2026-11-13T12:00:00.000Z',
      updatedAt: '2026-11-13T12:30:00.000Z',
    });
  });
});

describe('PgTaskRepository (com Pool simulado)', () => {
  it('lista usando filtro parametrizado', async () => {
    const { pool, query } = mockPool({ rows: [row] });
    const tasks = await new PgTaskRepository(pool).list('pendente');
    expect(tasks).toHaveLength(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('$1'), ['pendente']);
  });

  it('retorna null quando a tarefa não existe', async () => {
    const { pool } = mockPool({ rows: [] });
    await expect(new PgTaskRepository(pool).findById(99)).resolves.toBeNull();
  });

  it('insere com status padrão', async () => {
    const { pool, query } = mockPool({ rows: [row] });
    await new PgTaskRepository(pool).create({ title: 'Configurar CI' });
    expect(query.mock.calls[0][1]).toEqual(['Configurar CI', null, 'pendente']);
  });

  it('só altera a descrição quando ela é enviada', async () => {
    const { pool, query } = mockPool({ rows: [row] });
    const repository = new PgTaskRepository(pool);
    await repository.update(1, { status: 'concluida' });
    expect(query.mock.calls[0][1]).toEqual([1, null, false, null, 'concluida']);
    await repository.update(1, { description: null });
    expect(query.mock.calls[1][1]).toEqual([1, null, true, null, null]);
  });

  it('informa se a exclusão removeu alguma linha', async () => {
    await expect(new PgTaskRepository(mockPool({ rowCount: 1 }).pool).remove(1)).resolves.toBe(
      true,
    );
    await expect(new PgTaskRepository(mockPool({ rowCount: 0 }).pool).remove(1)).resolves.toBe(
      false,
    );
  });
});
