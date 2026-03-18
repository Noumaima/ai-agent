# Task Board Example

This example is a backend-only task board for AI-assisted work. It exposes a Django REST API for agents, tasks, and executions, and uses Celery to schedule and run background jobs that generate email drafts through the Hugging Face router.

## What is included

- Django 4.2 API with Django REST Framework
- PostgreSQL for persistent storage
- RabbitMQ as the Celery broker
- Redis as the Celery result backend
- Celery worker for asynchronous execution
- Celery Beat for periodic scheduling
- Flower for queue monitoring
- Gunicorn as the Django application server
- WhiteNoise for static file serving in the Django container

## Core workflow

1. Create an agent.
2. Create a task.
3. Assign the agent to the task.
4. Trigger an execution immediately or schedule it for later.
5. Celery Beat dispatches due work.
6. The worker calls the Hugging Face chat completion API, stores the result, and optionally sends the generated email.

Periodic tasks are also supported. Beat checks every minute for recurring tasks and creates executions automatically when their scheduled time matches the current minute.

## Project structure

```text
example/
|-- .env
|-- docker-compose.yml
|-- flow.md
`-- task_board/
    |-- Dockerfile
    |-- entrypoint.sh
    |-- manage.py
    |-- requirements.txt
    |-- board/
    |   |-- management/commands/seed_example.py
    |   |-- models.py
    |   |-- tasks.py
    |   |-- tests.py
    |   `-- views.py
    `-- task_board/
        |-- celery.py
        |-- celery_config.py
        |-- settings.py
        `-- urls.py
```

## Services and ports

| Service | Purpose | Port |
|---|---|---|
| Django | REST API | `8001` |
| PostgreSQL | Primary database | `5432` |
| RabbitMQ | Celery broker | `5672` |
| RabbitMQ management | Broker UI | `15672` |
| Flower | Celery monitoring UI | `5555` |

Redis is used internally as the Celery result backend and is not published to the host in the current compose file.

## Environment variables

The app reads configuration from `example/.env`.

Important variables:

- `DEBUG`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `TIME_ZONE`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `HF_TOKEN`
- `HF_MODEL_ID`
- `SEND_EMAILS`
- `DEFAULT_FROM_EMAIL`
- `EMAIL_BACKEND`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `EMAIL_USE_TLS`

## Important notes

- The API currently uses `AllowAny`, so there is no authentication or authorization enabled by default.
- Real credentials appear to be stored in `.env`. Replace them before sharing this project or deploying it anywhere public.
- If `SEND_EMAILS=0`, email generation still runs, but the message is not sent through SMTP.
- If `HF_TOKEN` is missing, background executions will fail when the worker tries to call the model.

## Run with Docker

From the `example` directory:

```bash
docker compose up --build
```

What happens on startup:

- PostgreSQL, RabbitMQ, Redis, Flower, Django, Celery worker, and Celery Beat are started
- the Django container runs database migrations automatically through `entrypoint.sh`
- the Django container runs `collectstatic` automatically through `entrypoint.sh`
- the Django app is served by Gunicorn on port `8000` inside the container

Useful URLs after startup:

- API root: `http://localhost:8001/api/`
- Admin: `http://localhost:8001/admin/`
- Flower: `http://localhost:5555/`
- RabbitMQ management: `http://localhost:15672/`

## Common Docker commands

Seed sample data:

```bash
docker compose exec django python manage.py seed_example
```

Run tests:

```bash
docker compose exec django python manage.py test
```

Create an admin user:

```bash
docker compose exec django python manage.py createsuperuser
```

Stop the stack:

```bash
docker compose down
```

Stop the stack and remove volumes:

```bash
docker compose down -v
```

## Run locally without Docker

The project can fall back to SQLite when `POSTGRES_DB` is not set, but Celery still expects RabbitMQ and Redis unless you change the broker and backend settings.

From `example/task_board`:

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

On macOS or Linux, use `. .venv/bin/activate` instead.

If you want the full async flow locally, also start RabbitMQ, Redis, a Celery worker, and Celery Beat with matching environment variables.

## Data model summary

### Agent

Represents an AI worker configuration.

Key fields:

- `name`
- `status`
- `agent_type`
- `model_name`
- `system_prompt`
- `default_estimated_seconds`

### Task

Represents a card on the board.

Key fields:

- `assigned_agent`
- `title`
- `description`
- `priority`
- `status`
- `recipient_email`
- `estimated_seconds`
- `actual_seconds`
- `is_periodic`
- `schedule_time`
- `last_scheduled_at`
- `last_execution_status`

### Execution

Represents one queued or completed run for a task.

Key fields:

- `task`
- `agent`
- `status`
- `scheduled_for`
- `started_at`
- `finished_at`
- `estimated_seconds`
- `actual_seconds`
- `celery_task_id`
- `input_payload`
- `output_payload`
- `error_message`

## API endpoints

Base URL: `http://localhost:8001/api/`

Main routes:

- `GET /agents/`
- `POST /agents/`
- `GET /tasks/`
- `POST /tasks/`
- `GET /executions/`
- `GET /executions/{id}/`
- `POST /tasks/{id}/assign_agent/`
- `POST /tasks/{id}/transition/`
- `POST /tasks/{id}/execute/`
- `POST /executions/{id}/retry/`

## Example API usage

Create an agent:

```bash
curl -X POST http://localhost:8001/api/agents/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Email Agent",
    "description": "Generates concise follow-up emails",
    "status": "active",
    "agent_type": "email_assistant",
    "model_name": "openai/gpt-oss-120b:fastest",
    "system_prompt": "You write short, persuasive, professional sales emails.",
    "default_estimated_seconds": 180
  }'
```

Create a task:

```bash
curl -X POST http://localhost:8001/api/tasks/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Draft follow-up for Acme lead",
    "description": "Write a follow-up email for a prospect who requested pricing details.",
    "priority": "high",
    "status": "backlog",
    "recipient_email": "prospect@example.com",
    "estimated_seconds": 180
  }'
```

Assign an agent to a task:

```bash
curl -X POST http://localhost:8001/api/tasks/1/assign_agent/ \
  -H "Content-Type: application/json" \
  -d '{"agent_id": 1}'
```

Move a task to another column:

```bash
curl -X POST http://localhost:8001/api/tasks/1/transition/ \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

Schedule a task execution:

```bash
curl -X POST http://localhost:8001/api/tasks/1/execute/ \
  -H "Content-Type: application/json" \
  -d '{
    "estimated_seconds": 180,
    "scheduled_for": "2026-03-19T00:00:00Z",
    "input_payload": {
      "tone": "friendly"
    }
  }'
```

Retry an execution:

```bash
curl -X POST http://localhost:8001/api/executions/<execution-id>/retry/ \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_for": "2026-03-19T00:05:00Z"
  }'
```

## Scheduling behavior

- `schedule_periodic_tasks` runs every minute and creates executions for recurring tasks
- `dispatch_due_executions` runs every 30 seconds and enqueues due executions onto Celery
- `run_agent_execution` performs the model call, saves output, optionally sends email, updates execution state, and moves the task to `done` on success

## Testing

Current tests cover:

- client-provided schedule times when creating executions
- validation for invalid schedule timestamps
- daily periodic scheduling behavior
- dispatching due executions to Celery
- task transition validation

Run them with:

```bash
docker compose exec django python manage.py test
```

## Seed data

The included seed command creates:

- one sample agent
- one backlog task
- one in-progress task
- one done task
- one periodic midnight task

Run:

```bash
docker compose exec django python manage.py seed_example
```
