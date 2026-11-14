import { Pool } from 'pg';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(120) NOT NULL,
  description TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pendente'
              CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
`;

export function createPool(connectionString = process.env.DATABASE_URL): Pool {
  if (!connectionString) {
    throw new Error('A variável de ambiente DATABASE_URL não foi definida');
  }
  return new Pool({ connectionString });
}

/** Cria a tabela de tarefas caso ainda não exista. */
export async function migrate(pool: Pool): Promise<void> {
  await pool.query(SCHEMA_SQL);
}
