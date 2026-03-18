# React + Django + Postgres + Redis + RabbitMQ (Docker Compose)

Ce dépôt contient une stack complète **Front React** + **Back Django** + **Postgres** + **Redis** + **RabbitMQ** (avec conteneurs Docker et orchestration via Docker Compose).

## 1) Prérequis

- Docker + Docker Compose (plugin `docker compose`)
- Git
- (Optionnel) Node.js et Python si tu veux lancer en local sans Docker

Vérifier :
```bash
docker --version
docker compose version
git --version
```

---

## 2) Structure du projet (recommandée)

```
.
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── config/                 # ⚠️ adapte le nom si ton projet s'appelle autrement
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── app/                    # tes apps Django (ex: users/, core/, etc.)
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   └── src/
└── .env.example                # (optionnel) variables d'environnement
```

> Si ton React est basé sur **Vite**, le build produit `dist/` (pas `build/`). Dans ce cas, il faut ajuster le `frontend/Dockerfile`.

---

## 3) Services (docker-compose)

- `frontend` : Nginx sert l'application React (port **80**)
- `backend` : Django via Gunicorn (port **8000**)
- `postgres` : base de données (port **5432**)
- `redis` : cache / backend de résultats Celery (port **6379**)
- `rabbitmq` : message broker Celery (port **5672**) + UI (port **15672**)
- `celery_worker` : worker Celery (optionnel, mais inclus)

---

## 4) Configuration des variables

### Option A (simple) : variables dans `docker-compose.yml`
Le `docker-compose.yml` contient des valeurs par défaut (DB, RabbitMQ, etc.).
Pour un projet sérieux, évite les secrets en clair et utilise `.env`.

### Option B (propre) : fichier `.env`
Crée un fichier `.env` à la racine :

```bash
cp .env.example .env
```

Puis adapte les valeurs.

Exemple `.env.example` (si tu veux l’utiliser) :
```env
DJANGO_SETTINGS_MODULE=config.settings
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=0

DB_HOST=postgres
DB_NAME=appdb
DB_USER=appuser
DB_PASSWORD=apppass
DB_PORT=5432

REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=amqp://rabbit:rabbitpass@rabbitmq:5672//
CELERY_RESULT_BACKEND=redis://redis:6379/1
```

> Si tu utilises `.env`, ajoute dans `docker-compose.yml` : `env_file: .env` pour les services concernés.

---

## 5) Lancer le projet (Docker)

### Build + run
```bash
docker compose up --build
```

### En arrière-plan
```bash
docker compose up -d --build
```

### Voir les logs
```bash
docker compose logs -f
```

### Arrêter
```bash
docker compose down
```

### Arrêter + supprimer volumes (⚠️ supprime les données Postgres)
```bash
docker compose down -v
```

---

## 6) Accès

- Frontend : http://localhost/
- Backend (direct) : http://localhost:8000/
- Backend (via proxy Nginx) : http://localhost/api/
- RabbitMQ Management UI : http://localhost:15672/
  - user: `rabbit`
  - pass: `rabbitpass`

---

## 7) Django : migrations / superuser / collectstatic

Ouvrir un shell dans le conteneur backend :
```bash
docker compose exec backend bash
```

### Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Créer un superuser
```bash
python manage.py createsuperuser
```

### Collect static (si tu sers des staticfiles)
```bash
python manage.py collectstatic --noinput
```

---

## 8) Celery (si utilisé)

Le worker est lancé par le service `celery_worker`.

### Vérifier que le worker tourne
```bash
docker compose logs -f celery_worker
```

### Notes
- Broker : RabbitMQ (`CELERY_BROKER_URL`)
- Result backend : Redis (`CELERY_RESULT_BACKEND`)

---

## 9) Nginx (frontend) : routing SPA + proxy API

Le fichier `frontend/nginx.conf` :
- sert React (SPA) avec `try_files ... /index.html`
- proxifie `/api/` vers `backend:8000`

Donc dans React, appelle l’API via :
- `fetch("/api/....")`

---

## 10) Dépannage (problèmes fréquents)

### A) "ModuleNotFoundError: config"
Le module WSGI dans `backend/Dockerfile` doit correspondre à ton projet :
- `CMD ["gunicorn", "config.wsgi:application", ...]`

Si ton projet s’appelle `myproject`, remplace par :
- `myproject.wsgi:application`

### B) React build output
- CRA -> `/app/build`
- Vite -> `/app/dist`

Ajuster le `frontend/Dockerfile` en conséquence.

### C) Connexion DB
Vérifie que Django utilise bien les variables :
- host = `postgres`
- port = `5432`

---

## 11) Roadmap (optionnel)
- Ajouter un service `celery_beat` (tâches planifiées)
- Ajouter un reverse proxy unique (Traefik) + HTTPS
- Ajouter CI/CD (GitLab CI) pour build + push images + deploy

---