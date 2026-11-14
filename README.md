# API de Tarefas: CI com GitHub Actions

API REST de tarefas (to-do) em **Node.js + TypeScript + Express** com banco **PostgreSQL**, usada para
implementar um pipeline de **Integração Contínua** com GitHub Actions disparado por **Pull Request**.

Aluno: **Carlos Eduardo Gonçalves do Espirito Santo**

## Pipeline de CI (`.github/workflows/ci.yml`)

Disparado em `pull_request` (abertura, novo commit e reabertura) para `main` e `develop`.

```
 1. Análise estática + formatação ─┐
                                   ├─► 3. Build ─► 4. Testes (unit + integração) ─► 5. Imagem Docker
 2. Análise de segurança ──────────┘
```

| Job                              | O que faz                                                                                                        | Ferramentas                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1. Análise estática e formatação | estilo, más práticas e tipos                                                                                     | Prettier, ESLint (+ `eslint-plugin-security`), `tsc --noEmit`                  |
| 2. Análise estática de segurança | SAST no código e vulnerabilidades em dependências                                                                | Semgrep (`p/javascript`, `p/typescript`, `p/nodejs`, `p/secrets`), `npm audit` |
| 3. Build                         | compila TypeScript para `dist/` e guarda como artefato                                                           | `tsc`                                                                          |
| 4. Testes                        | unitários (mocks, cobertura mínima de 80%) e integração com PostgreSQL real em `services`; smoke test do `dist/` | Vitest, Supertest, PostgreSQL 16                                               |
| 5. Imagem                        | constrói e publica no GHCR com tags `pr-N` e `sha-xxxxxxx`                                                       | Docker Buildx, `docker/build-push-action`                                      |

Os jobs 1 e 2 rodam em paralelo; os demais são encadeados com `needs` (_fail fast_): se um falha,
os seguintes não rodam e o PR fica reprovado.

## Endpoints

| Método | Rota                         | Descrição                                           |
| ------ | ---------------------------- | --------------------------------------------------- |
| GET    | `/health`                    | status da API e do banco                            |
| GET    | `/api/tasks?status=pendente` | lista tarefas (filtro opcional)                     |
| GET    | `/api/tasks/:id`             | busca uma tarefa                                    |
| POST   | `/api/tasks`                 | cria (`title` obrigatório, `description`, `status`) |
| PUT    | `/api/tasks/:id`             | atualiza parcialmente                               |
| DELETE | `/api/tasks/:id`             | remove                                              |

`status`: `pendente` · `em_andamento` · `concluida`

## Rodando localmente

```bash
docker compose up --build        # API em http://localhost:3000 + PostgreSQL
```

Sem Docker para a API:

```bash
npm ci
export DATABASE_URL=postgresql://app:app@localhost:5432/app
npm run dev
```

## Scripts

| Script                     | Uso                                              |
| -------------------------- | ------------------------------------------------ |
| `npm run format:check`     | Prettier                                         |
| `npm run lint`             | ESLint                                           |
| `npm run typecheck`        | `tsc --noEmit`                                   |
| `npm run build`            | compila para `dist/`                             |
| `npm run test:unit`        | testes unitários + cobertura                     |
| `npm run test:integration` | testes de integração (precisa de `DATABASE_URL`) |
