import { createApp } from './app';
import { createPool, migrate } from './db';
import { PgTaskRepository } from './tasks/task.repository';

async function main(): Promise<void> {
  const pool = createPool();
  await migrate(pool);

  const app = createApp({
    taskRepository: new PgTaskRepository(pool),
    checkDatabase: async () => {
      await pool.query('SELECT 1');
    },
  });

  const port = Number(process.env.PORT ?? 3000);
  const server = app.listen(port, () => {
    console.log(`API de tarefas ouvindo na porta ${port}`);
  });

  const shutdown = (): void => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err: unknown) => {
  console.error('Falha ao iniciar a API', err);
  process.exit(1);
});
