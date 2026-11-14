import { Router } from 'express';
import { TaskRepository } from './task.repository';
import { parseId, parseStatus, validateCreateTask, validateUpdateTask } from './task.validation';

const NOT_FOUND = { error: 'Tarefa não encontrada' };

export function taskRoutes(repository: TaskRepository): Router {
  const router = Router();

  // GET /api/tasks?status=pendente
  router.get('/', async (req, res) => {
    const status = parseStatus(req.query.status);
    res.json(await repository.list(status));
  });

  // GET /api/tasks/:id
  router.get('/:id', async (req, res) => {
    const task = await repository.findById(parseId(req.params.id));
    if (!task) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.json(task);
  });

  // POST /api/tasks
  router.post('/', async (req, res) => {
    const task = await repository.create(validateCreateTask(req.body));
    res.status(201).location(`/api/tasks/${task.id}`).json(task);
  });

  // PUT /api/tasks/:id
  router.put('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const task = await repository.update(id, validateUpdateTask(req.body));
    if (!task) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.json(task);
  });

  // DELETE /api/tasks/:id
  router.delete('/:id', async (req, res) => {
    const removed = await repository.remove(parseId(req.params.id));
    if (!removed) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.status(204).end();
  });

  return router;
}
