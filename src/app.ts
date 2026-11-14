import express, { ErrorRequestHandler, Express } from 'express';
import helmet from 'helmet';
import { TaskRepository } from './tasks/task.repository';
import { taskRoutes } from './tasks/task.routes';
import { ValidationError } from './tasks/task.validation';

export interface AppDependencies {
  taskRepository: TaskRepository;
  /** Verifica se o banco responde; usado pelo GET /health. */
  checkDatabase?: () => Promise<void>;
}

export function createApp({ taskRepository, checkDatabase }: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (_req, res) => {
    try {
      await checkDatabase?.();
      res.json({ status: 'ok', database: checkDatabase ? 'up' : 'unknown' });
    } catch {
      res.status(503).json({ status: 'error', database: 'down' });
    }
  });

  app.use('/api/tasks', taskRoutes(taskRepository));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message, details: err.details });
      return;
    }
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'JSON inválido' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  };
  app.use(errorHandler);

  return app;
}
