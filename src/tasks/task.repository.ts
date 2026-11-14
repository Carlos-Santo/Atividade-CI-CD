import { Pool } from 'pg';
import { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from './task.model';

export interface TaskRepository {
  list(status?: TaskStatus): Promise<Task[]>;
  findById(id: number): Promise<Task | null>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: number, input: UpdateTaskInput): Promise<Task | null>;
  remove(id: number): Promise<boolean>;
}

export interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: Date;
  updated_at: Date;
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Persiste as tarefas no PostgreSQL usando apenas consultas parametrizadas. */
export class PgTaskRepository implements TaskRepository {
  constructor(private readonly pool: Pool) {}

  async list(status?: TaskStatus): Promise<Task[]> {
    const result = await this.pool.query<TaskRow>(
      `SELECT id, title, description, status, created_at, updated_at
         FROM tasks
        WHERE ($1::text IS NULL OR status = $1::text)
        ORDER BY id`,
      [status ?? null],
    );
    return result.rows.map(toTask);
  }

  async findById(id: number): Promise<Task | null> {
    const result = await this.pool.query<TaskRow>(
      `SELECT id, title, description, status, created_at, updated_at
         FROM tasks
        WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toTask(result.rows[0]) : null;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const result = await this.pool.query<TaskRow>(
      `INSERT INTO tasks (title, description, status)
       VALUES ($1, $2, $3)
       RETURNING id, title, description, status, created_at, updated_at`,
      [input.title, input.description ?? null, input.status ?? 'pendente'],
    );
    return toTask(result.rows[0]);
  }

  async update(id: number, input: UpdateTaskInput): Promise<Task | null> {
    const result = await this.pool.query<TaskRow>(
      `UPDATE tasks
          SET title       = COALESCE($2, title),
              description = CASE WHEN $3::boolean THEN $4 ELSE description END,
              status      = COALESCE($5, status),
              updated_at  = NOW()
        WHERE id = $1
        RETURNING id, title, description, status, created_at, updated_at`,
      [
        id,
        input.title ?? null,
        input.description !== undefined,
        input.description ?? null,
        input.status ?? null,
      ],
    );
    return result.rows[0] ? toTask(result.rows[0]) : null;
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
