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

## 10) Patroni (PostgreSQL HA) — Détails

Cette section explique comment structurer un **cluster PostgreSQL HA** avec **Patroni** au lieu d’un Postgres “standalone”.

### 10.1) C’est quoi Patroni ?
**Patroni** est un outil de haute disponibilité pour PostgreSQL qui gère :
- l’élection du **leader** (primary),
- le **failover** automatique,
- la configuration de la **réplication**,
- la cohérence du cluster via un **DCS** (*Distributed Configuration Store*).

Patroni ne “remplace” pas PostgreSQL : il **orchestre** PostgreSQL.

### 10.2) DCS : etcd / Consul / ZooKeeper
Patroni a besoin d’un DCS pour stocker l’état du cluster et coordonner le leader.
Le choix le plus courant en conteneurs est **etcd**.

Dans Docker Compose, un design simple est :
- `etcd` (1 noeud en dev)
- `patroni-1`, `patroni-2`, `patroni-3` (Postgres + Patroni)
- (optionnel) `haproxy` (un endpoint unique pour l’app)

> En production, etcd doit être en cluster (3 ou 5 noeuds). Un seul etcd en dev est OK uniquement pour test.

### 10.3) Pourquoi ajouter HAProxy ?
Sans HAProxy (ou PgBouncer/ProxySQL), ton application doit savoir “qui est le leader”.
Avec HAProxy :
- l’app se connecte toujours à `haproxy:5432`
- HAProxy envoie vers le **leader** (write)
- (optionnel) un autre port envoie vers les **replicas** (read)

### 10.4) Ports et endpoints recommandés
- HAProxy write (leader) : `5432`
- HAProxy read (replicas) : `5433` (optionnel)
- Patroni REST API : `8008` sur chaque noeud (pour health checks)
- Postgres : `5432` sur chaque noeud Patroni

### 10.5) Variables Django à adapter
Au lieu de `DB_HOST=postgres`, tu mettras typiquement :
- `DB_HOST=haproxy`
- `DB_PORT=5432`
- `DB_NAME=appdb`
- `DB_USER=appuser`
- `DB_PASSWORD=...`

### 10.6) Exemple d’architecture Docker Compose (concept)
**Objectif** : remplacer `postgres` par `patroni` + `etcd` (+ `haproxy`).

Services:
- `etcd` : coordination
- `patroni1`, `patroni2`, `patroni3` : noeuds Postgres managés par Patroni
- `haproxy` : endpoint DB pour l’application

### 10.7) Flux de fonctionnement (leader/failover)
1. Patroni démarre PostgreSQL sur chaque noeud.
2. Patroni consulte le DCS (etcd) :
   - si aucun leader n’existe, un noeud se proclame leader.
3. Les autres noeuds deviennent replicas et se synchronisent.
4. Si le leader tombe :
   - Patroni détecte l’échec (TTL/healthcheck via DCS),
   - une élection se fait,
   - un replica est promu leader,
   - HAProxy redirige automatiquement les connexions vers le nouveau leader.

### 10.8) Tests de base (à faire en entretien / démo)
- Vérifier l’état du cluster via l’API Patroni (port 8008).
- Stopper le leader et observer la promotion d’un replica.
- Vérifier que l’application continue à fonctionner via HAProxy.

Exemples (conceptuels) :
```bash
# voir les services
docker compose ps

# logs patroni
docker compose logs -f patroni1

# simuler une panne
docker compose stop patroni1
# observer l’élection et la promotion
```

### 10.9) Notes importantes (production)
- Ajouter du monitoring (Prometheus, Grafana).
- Mettre les volumes (données Postgres) sur du stockage fiable.
- Gérer les secrets (passwords) via un secret manager.
- Mettre etcd en cluster (3/5 noeuds).
- Configurer des politiques de sauvegarde (pgBackRest, wal-g, etc.).

> Cette section décrit le “pourquoi/comment”. Si tu veux, je peux aussi te générer un `docker-compose.patroni.yml` complet (etcd + 3 patroni + haproxy) adapté à tes noms de DB/users.

---

## 11) Dépannage (problèmes fréquents)

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
- host = `postgres` (ou `haproxy` si Patroni)
- port = `5432`

---