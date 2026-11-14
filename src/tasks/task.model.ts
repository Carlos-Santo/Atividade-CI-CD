export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida';

export const TASK_STATUSES: readonly TaskStatus[] = ['pendente', 'em_andamento', 'concluida'];

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}
