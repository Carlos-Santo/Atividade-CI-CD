import { describe, expect, it } from 'vitest';
import {
  TITLE_MAX_LENGTH,
  ValidationError,
  parseId,
  parseStatus,
  validateCreateTask,
  validateUpdateTask,
} from '../../src/tasks/task.validation';

function errorsOf(fn: () => unknown): string[] {
  try {
    fn();
  } catch (err) {
    if (err instanceof ValidationError) return err.details;
    throw err;
  }
  throw new Error('era esperado um ValidationError');
}

describe('validateCreateTask', () => {
  it('aceita uma tarefa válida e aplica os valores padrão', () => {
    expect(validateCreateTask({ title: '  Estudar CI  ' })).toEqual({
      title: 'Estudar CI',
      description: null,
      status: 'pendente',
    });
  });

  it('mantém descrição e status informados', () => {
    expect(
      validateCreateTask({ title: 'Deploy', description: 'subir a imagem', status: 'concluida' }),
    ).toEqual({ title: 'Deploy', description: 'subir a imagem', status: 'concluida' });
  });

  it('exige o título', () => {
    expect(errorsOf(() => validateCreateTask({}))).toContain(
      'title é obrigatório e deve ser um texto',
    );
    expect(errorsOf(() => validateCreateTask({ title: '   ' }))).toHaveLength(1);
  });

  it('limita o tamanho do título', () => {
    const title = 'a'.repeat(TITLE_MAX_LENGTH + 1);
    expect(errorsOf(() => validateCreateTask({ title }))[0]).toMatch(/no máximo/);
  });

  it('rejeita status desconhecido e descrição que não é texto', () => {
    const errors = errorsOf(() =>
      validateCreateTask({ title: 'x', status: 'feito', description: 5 }),
    );
    expect(errors).toHaveLength(2);
  });

  it('rejeita corpo que não é objeto', () => {
    expect(() => validateCreateTask(null)).toThrow(ValidationError);
    expect(() => validateCreateTask(['title'])).toThrow(ValidationError);
  });
});

describe('validateUpdateTask', () => {
  it('aceita atualização parcial', () => {
    expect(validateUpdateTask({ status: 'em_andamento' })).toEqual({ status: 'em_andamento' });
  });

  it('permite limpar a descrição com null', () => {
    expect(validateUpdateTask({ description: null })).toEqual({ description: null });
  });

  it('exige ao menos um campo', () => {
    expect(errorsOf(() => validateUpdateTask({}))[0]).toMatch(/ao menos um campo/);
  });

  it('valida os campos informados', () => {
    expect(errorsOf(() => validateUpdateTask({ title: '' }))).toHaveLength(1);
  });
});

describe('parseId e parseStatus', () => {
  it('converte ids válidos', () => {
    expect(parseId('42')).toBe(42);
  });

  it.each(['0', '-1', '1.5', 'abc', ''])('rejeita o id "%s"', (raw) => {
    expect(() => parseId(raw)).toThrow(ValidationError);
  });

  it('aceita status ausente ou válido e rejeita os demais', () => {
    expect(parseStatus(undefined)).toBeUndefined();
    expect(parseStatus('concluida')).toBe('concluida');
    expect(() => parseStatus('arquivada')).toThrow(ValidationError);
    expect(() => parseStatus(['pendente'])).toThrow(ValidationError);
  });
});
