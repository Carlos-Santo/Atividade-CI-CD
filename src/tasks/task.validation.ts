import {
  CreateTaskInput,
  TASK_STATUSES,
  TaskStatus,
  UpdateTaskInput,
  isTaskStatus,
} from './task.model';

export class ValidationError extends Error {
  constructor(public readonly details: string[]) {
    super('Dados inválidos');
    this.name = 'ValidationError';
  }
}

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 1000;

const STATUS_MESSAGE = `status deve ser um destes valores: ${TASK_STATUSES.join(', ')}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkTitle(value: unknown, errors: string[]): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push('title é obrigatório e deve ser um texto');
    return undefined;
  }
  const title = value.trim();
  if (title.length > TITLE_MAX_LENGTH) {
    errors.push(`title deve ter no máximo ${TITLE_MAX_LENGTH} caracteres`);
  }
  return title;
}

function checkDescription(value: unknown, errors: string[]): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    errors.push('description deve ser um texto');
    return undefined;
  }
  if (value.length > DESCRIPTION_MAX_LENGTH) {
    errors.push(`description deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres`);
  }
  return value;
}

export function parseStatus(value: unknown): TaskStatus | undefined {
  if (value === undefined) return undefined;
  if (!isTaskStatus(value)) throw new ValidationError([STATUS_MESSAGE]);
  return value;
}

function checkStatus(value: unknown, errors: string[]): TaskStatus | undefined {
  if (value === undefined) return undefined;
  if (!isTaskStatus(value)) {
    errors.push(STATUS_MESSAGE);
    return undefined;
  }
  return value;
}

/** Valida o corpo de um POST /api/tasks e aplica os valores padrão. */
export function validateCreateTask(body: unknown): CreateTaskInput {
  if (!isRecord(body)) {
    throw new ValidationError(['o corpo da requisição deve ser um objeto JSON']);
  }
  const errors: string[] = [];
  const title = checkTitle(body.title, errors);
  const description = checkDescription(body.description, errors);
  const status = checkStatus(body.status, errors);
  if (errors.length > 0 || title === undefined) throw new ValidationError(errors);
  return { title, description: description ?? null, status: status ?? 'pendente' };
}

/** Valida o corpo de um PUT /api/tasks/:id (atualização parcial). */
export function validateUpdateTask(body: unknown): UpdateTaskInput {
  if (!isRecord(body)) {
    throw new ValidationError(['o corpo da requisição deve ser um objeto JSON']);
  }
  const errors: string[] = [];
  const input: UpdateTaskInput = {};
  if (body.title !== undefined) input.title = checkTitle(body.title, errors);
  if (body.description !== undefined) {
    input.description = checkDescription(body.description, errors);
  }
  if (body.status !== undefined) input.status = checkStatus(body.status, errors);
  if (errors.length === 0 && Object.keys(input).length === 0) {
    errors.push('informe ao menos um campo: title, description ou status');
  }
  if (errors.length > 0) throw new ValidationError(errors);
  return input;
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError(['id deve ser um inteiro positivo']);
  }
  return id;
}
