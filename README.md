# Organizo DAM

A **Digital Asset Management** platform built as a pnpm + Turborepo monorepo. Upload files via resumable TUS protocol, process them through a typed worker pipeline, and manage assets through a clean React dashboard.

## Architecture

- **Auth service** — Express REST API for registration, login, JWT issuance, and session management via Redis
- **Upload service** — TUS resumable upload protocol backed by MinIO S3 storage, publishes jobs to RabbitMQ on completion
- **Asset service** — Express REST API for asset CRUD, tagging, share links, download tracking, and Prometheus metrics
- **Workers** — RabbitMQ consumers running a typed pipeline: Assembly → Metadata / Thumbnail / Transcode / Image / Document
- **Web** — React 19 + Vite + Tailwind CSS frontend with a full asset dashboard
- **PostgreSQL** — Primary store for assets, users, upload sessions, processing jobs, and share links
- **MinIO** — S3-compatible object storage for chunks, processed assets, and renditions
- **RabbitMQ** — Job queue between the upload service and the worker pipeline
- **Redis** — JWT session store and rate-limit state
- **Nginx** — Reverse proxy routing all traffic through a single `:80` entry point

## Features

- Resumable TUS uploads with automatic MinIO chunk storage
- Per-MIME worker fan-out after upload completes:
  - **Images** — thumbnail generation (Sharp), metadata extraction
  - **Videos** — thumbnail, metadata, and multi-resolution transcode (FFmpeg)
  - **Audio** — metadata extraction
  - **Documents** — metadata extraction (Poppler)
- Dead-letter queue with 3-attempt retry and 24-hour message TTL
- Asset filtering by status, MIME type, tag, and date range
- Tagging with tag removal support
- Password-protected share links with expiry and download limits
- Download tracking
- Presigned MinIO URLs for direct asset and rendition downloads
- Swagger UI at `http://localhost:3000/api-docs` or via Nginx
- Zod validation on all inputs, Helmet security headers on all services

## Prerequisites

- Docker and Docker Compose
- Node.js ≥ 18 (for local development without Docker)
- pnpm 9

## Quick start (Docker)

**1. Clone and install**

```bash
git clone https://github.com/ipsitam-07/organizo-dam
cd organizo-dam
pnpm install
```

**2. Set up environment**

```bash
cp .env.example .env
```

Open `.env` and fill in every value. The fields that must be changed before first boot:

| Variable            | Notes                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Any strong password                                                                       |
| `REDIS_PASSWORD`    | Any strong password                                                                       |
| `RABBITMQ_PASSWORD` | Any strong password                                                                       |
| `MINIO_ACCESS_KEY`  | Your chosen MinIO username                                                                |
| `MINIO_SECRET_KEY`  | Minimum 8 characters                                                                      |
| `JWT_SECRET`        | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

**3. Start all services**

```bash
docker compose up --build
```

On first boot this will start Postgres, Redis, RabbitMQ, and MinIO, create the `assets`, `chunks`, and `renditions` buckets automatically, then build and start all services.

**4. Open the app**

```
http://localhost
```

**View logs**

```bash
docker compose logs -f           # all services
docker compose logs -f workers   # single service
```

## Local development (without Docker)

**1. Start infrastructure only**

```bash
docker compose up postgres redis rabbitmq minio minio-init -d
```

**2. Configure environment**

```bash
cp .env.example .env
# set POSTGRES_HOST=localhost, REDIS_HOST=localhost, RABBITMQ_HOST=localhost, MINIO_ENDPOINT=localhost:9000
echo "VITE_API_URL=http://localhost" > apps/web/.env
```

**3. Run with hot reload**

```bash
pnpm dev                       # all services
pnpm dev --filter auth         # single service
```

## Service ports

| Service        | Port               | Notes                                    |
| -------------- | ------------------ | ---------------------------------------- |
| Frontend       | `http://localhost` | Via Nginx (Docker) or `:5173` (dev mode) |
| Auth service   | `:3001`            | Swagger UI at `:3001/api-docs`           |
| Upload service | `:3002`            |                                          |
| Asset service  | `:3003`            | Prometheus metrics at `:3003/metrics`    |
| Workers        | —                  | Metrics at `:9090/metrics`               |
| MinIO console  | `:9001`            | S3 API on `:9000`                        |
| RabbitMQ UI    | `:15672`           | Management dashboard                     |
| PostgreSQL     | `:5433`            | Host-side port (mapped from 5432)        |

## API endpoints

All requests through Nginx use base URL `http://localhost`.

### Auth — `/api/auth`

| Method | Path                 | Auth     | Description                                                       |
| ------ | -------------------- | -------- | ----------------------------------------------------------------- |
| `POST` | `/api/auth/register` | —        | Create account (email + password ≥8 chars, upper + lower + digit) |
| `POST` | `/api/auth/login`    | —        | Login, returns JWT                                                |
| `POST` | `/api/auth/logout`   | Required | Invalidate session                                                |
| `GET`  | `/api/auth/me`       | Required | Current user profile                                              |

### Assets — `/api/assets`

| Method   | Path                            | Description                                        |
| -------- | ------------------------------- | -------------------------------------------------- |
| `GET`    | `/api/assets`                   | List assets (paginated, filterable)                |
| `GET`    | `/api/assets/stats`             | Total assets, storage used, processing counts      |
| `GET`    | `/api/assets/:id`               | Get single asset                                   |
| `DELETE` | `/api/assets/:id`               | Delete asset and its storage objects               |
| `GET`    | `/api/assets/:id/download`      | Get presigned download URL (original or rendition) |
| `GET`    | `/api/assets/:id/status`        | Processing job status and progress                 |
| `GET`    | `/api/assets/:id/thumbnail`     | Get presigned thumbnail URL                        |
| `GET`    | `/api/assets/:id/renditions`    | List available renditions                          |
| `POST`   | `/api/assets/:id/tags`          | Add a tag                                          |
| `DELETE` | `/api/assets/:id/tags/:tagId`   | Remove a tag                                       |
| `POST`   | `/api/assets/:id/share`         | Create a share link                                |
| `DELETE` | `/api/assets/:id/share/:linkId` | Revoke a share link                                |

**Query parameters for `GET /api/assets`**

| Param                   | Type   | Description                                  |
| ----------------------- | ------ | -------------------------------------------- |
| `page`                  | number | Page number (default: 1)                     |
| `limit`                 | number | Results per page, max 100 (default: 20)      |
| `status`                | string | `queued`, `processing`, `ready`, or `failed` |
| `mime_type`             | string | e.g. `image/jpeg`                            |
| `tag`                   | string | Filter by tag name                           |
| `date_from` / `date_to` | date   | Upload date range                            |

**Share link options (`POST /api/assets/:id/share`)**

| Field              | Type   | Description                    |
| ------------------ | ------ | ------------------------------ |
| `password`         | string | Optional password (4–72 chars) |
| `max_downloads`    | number | Download limit (1–10000)       |
| `expires_in_hours` | number | Expiry in hours (1–8760)       |

### Upload — `/api/upload`

Uploads use the **TUS resumable protocol** at `/api/upload/core`. Use `tus-js-client` or any TUS-compatible library.

| Method   | Path                              | Description                  |
| -------- | --------------------------------- | ---------------------------- |
| `GET`    | `/api/upload/sessions`            | List your upload sessions    |
| `GET`    | `/api/upload/sessions/:id`        | Get session details          |
| `DELETE` | `/api/upload/sessions/:id/cancel` | Cancel an in-progress upload |

### Share (public, no auth)

| Method | Path                | Description                 |
| ------ | ------------------- | --------------------------- |
| `GET`  | `/api/share/:token` | Resolve a public share link |

### Health checks

| Path             | Service |
| ---------------- | ------- |
| `/health/auth`   | Auth    |
| `/health/upload` | Upload  |
| `/health/asset`  | Asset   |

## Worker pipeline

After a TUS upload completes, the upload service publishes a job to RabbitMQ. The **AssemblyWorker** picks it up first, moves the file from the chunks bucket to the assets bucket, then fans out based on MIME type:

```
Upload complete
      │
      ▼
AssemblyWorker         (moves chunk → asset bucket)
      │
      ├── image/*    → ImageWorker       (Sharp thumbnail + metadata)
      ├── video/*    → MetadataWorker    (FFmpeg metadata)
      │              → ThumbnailWorker   (FFmpeg thumbnail)
      │              → TranscodeWorker   (FFmpeg multi-resolution)
      ├── audio/*    → MetadataWorker    (FFmpeg metadata)
      └── doc/*      → DocumentWorker   (Poppler metadata)
```

| Type         | Inputs                              | Output                                                                                     |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| **Image**    | jpeg, png, webp, gif, tiff, avif    | 3 renditions: thumbnail (640px JPEG), medium (1280px WebP), large (2560px WebP) + metadata |
| **Video**    | mp4, mov, avi, webm, mkv, mpeg, 3gp | Thumbnail + metadata via FFmpeg, transcode to 360p / 720p / 1080p H.264 MP4                |
| **Audio**    | mp3, wav, ogg, aac                  | Metadata only via FFprobe                                                                  |
| **Document** | pdf                                 | Metadata only via Poppler                                                                  |

Failed jobs are routed to a dead-letter exchange after 3 attempts. Status is surfaced via `GET /api/assets/:id/status`.

## Frontend

React 19 + Vite SPA using TanStack Query for server state and Tailwind CSS v4 for styling.

| Path         | Page                             |
| ------------ | -------------------------------- |
| `/signup`    | Registration                     |
| `/login`     | Login                            |
| `/dashboard` | Main asset dashboard (protected) |

Dashboard includes grid/list view, live search, status filters, upload modal with TUS progress, asset detail with tags and renditions, share link creation, and storage stats.

## Building for production

```bash
pnpm build                   # all services
pnpm build --filter auth     # single service
pnpm build --filter web
```

## Testing

```bash
pnpm test                          # all
pnpm test --filter asset           # single service
pnpm --filter asset test:coverage  # with coverage
```

## Environment variables

See `.env.example` at the project root. Frontend env at `apps/web/.env`:

```env
VITE_API_URL=http://localhost
```

## Project structure

```
organizo-dam/
├── apps/
│   ├── auth/        # Auth microservice
│   ├── upload/      # Upload microservice (TUS)
│   ├── asset/       # Asset microservice
│   ├── workers/     # Background worker pipeline
│   └── web/         # React 19 + Vite frontend
├── packages/
│   ├── auth/        # Shared JWT middleware and Redis helpers
│   ├── config/      # Centralised dotenv config
│   ├── database/    # Sequelize models (pg)
│   ├── rabbitmq/    # AMQP client and queue constants
│   ├── rate-limit/  # Shared rate limiting middleware
│   └── logger/      # Structured logger
├── infra/
│   ├── nginx/       # Reverse proxy config
│   ├── postgres/    # DB init SQL
│   └── rabbitmq/    # RabbitMQ definitions
├── k8s/             # Kubernetes manifests
├── swagger.yml      # OpenAPI 3.0 spec
└── docker-compose.yml
```

## Security

- **JWT + Redis sessions** — logout invalidates the token immediately server-side
- **Rate limiting** — auth: 15 req/15min · API: 300 req/min · upload: 60 req/min · share: 30 req/min
- **Helmet** — security headers on every service
- **Zod validation** — all inputs validated before reaching controllers
- **Presigned URLs** — downloads served directly from MinIO, never proxied through the app

## Monitoring

Prometheus metrics at `:3003/metrics` (asset service) and `:9090/metrics` (workers).

```bash
curl http://localhost/health/auth
curl http://localhost/health/upload
curl http://localhost/health/asset
```

## Scaling

Workers are the natural scaling target — they are stateless and CPU-heavy:

```bash
docker compose up --scale workers=4 -d
```

Auth, upload, and asset are also stateless and can be scaled the same way. Nginx round-robins across all instances automatically.

## Kubernetes

Manifests are in `k8s/`. Namespace: `dam-platform`.

**1. Build images**

```bash
docker build -f apps/auth/Dockerfile    -t dam-platform/auth:latest    .
docker build -f apps/upload/Dockerfile  -t dam-platform/upload:latest  .
docker build -f apps/asset/Dockerfile   -t dam-platform/asset:latest   .
docker build -f apps/workers/Dockerfile -t dam-platform/workers:latest .
docker build -f apps/web/Dockerfile     -t dam-platform/web:latest     .
```

For minikube, load each image with `minikube image load dam-platform/<name>:latest`. For a remote cluster, push to a registry and update the `image:` field in each manifest.

**2. Replace secrets**

`k8s/secrets/secrets.yaml` contains base64-encoded placeholders. Encode your values and replace them before applying:

```bash
echo -n "your_password" | base64
```

**3. Deploy**

Save as `deploy.sh` and run `chmod +x deploy.sh && ./deploy.sh`:

```bash
#!/bin/bash
set -e

kubectl apply -f k8s/namespace/namespace.yaml
kubectl apply -f k8s/configmap/configmap.yaml
kubectl apply -f k8s/secrets/secrets.yaml

# Infrastructure
kubectl apply -f k8s/postgres/postgres.yaml
kubectl apply -f k8s/redis/redis.yaml
kubectl apply -f k8s/rabbitmq/rabbitmq.yaml
kubectl apply -f k8s/minio/minio.yaml

# Wait for infra before starting services
kubectl wait --for=condition=ready pod -l app=postgres  -n dam-platform --timeout=90s
kubectl wait --for=condition=ready pod -l app=redis     -n dam-platform --timeout=60s
kubectl wait --for=condition=ready pod -l app=rabbitmq  -n dam-platform --timeout=90s
kubectl wait --for=condition=ready pod -l app=minio     -n dam-platform --timeout=60s

# Application
kubectl apply -f k8s/auth/auth.yaml
kubectl apply -f k8s/upload/upload.yaml
kubectl apply -f k8s/asset/asset.yaml
kubectl apply -f k8s/workers/workers.yaml
kubectl apply -f k8s/web/web.yaml
kubectl apply -f k8s/ingress/ingress.yaml
kubectl apply -f k8s/hpa/hpa.yaml
kubectl apply -f k8s/monitoring/monitoring.yaml

echo "Done. Run: kubectl get pods -n dam-platform"
```

**4. Verify**

```bash
kubectl get pods    -n dam-platform
kubectl get ingress -n dam-platform
kubectl get hpa     -n dam-platform
```

Workers autoscale between 2–10 replicas on CPU (target 70%). Prometheus `ServiceMonitor` resources scrape workers, asset, and RabbitMQ every 15s.

> **Note:** All stateful services use `emptyDir` — data is lost on pod restart. Replace with `PersistentVolumeClaim` for production.

## Troubleshooting

**Workers not processing jobs**

```bash
# Check RabbitMQ queues and message counts
docker exec dam-rabbitmq rabbitmqctl list_queues name messages consumers

# Restart workers
docker compose restart workers
```

**Asset stuck in `processing`**

```bash
docker compose logs -f workers
```

**MinIO upload failing**

```bash
docker compose logs minio-init            # verify buckets were created
curl http://localhost:9000/minio/health/live
```

**Out of memory on video processing**

Increase the workers memory limit in `docker-compose.yml`:

```yaml
workers:
  deploy:
    resources:
      limits:
        memory: 4G
```

**Video processing fails**

```bash
docker exec dam-workers ffmpeg -version
```

## UI Screenshots

1. Dashboard (Grid View)
   ![![alt text](<Screenshot 2026-03-16 at 10.31.44 AM.png>)](<public/Screenshot 2026-03-16 at 10.31.44 AM.png>)

2. Dashboard (List View)
   ![![](<Screenshot 2026-03-16 at 10.33.41 AM.png>)](<public/Screenshot 2026-03-16 at 10.33.41 AM.png>)

3. Dashboard (with Search filter)
   ![![alt text](<Screenshot 2026-03-16 at 10.31.57 AM.png>)](<public/Screenshot 2026-03-16 at 10.31.57 AM.png>)

4. Asset Previews (download, share, delete)
   ![![alt text](<Screenshot 2026-03-16 at 10.31.02 AM.png>)](<public/Screenshot 2026-03-16 at 10.31.02 AM.png>)

![![alt text](<Screenshot 2026-03-16 at 10.31.12 AM.png>)](<public/Screenshot 2026-03-16 at 10.31.12 AM.png>)

![![alt text](<Screenshot 2026-03-16 at 10.31.20 AM.png>)](<public/Screenshot 2026-03-16 at 10.31.20 AM.png>)

![![alt text](<Screenshot 2026-03-16 at 10.31.27 AM.png>)](<public/Screenshot 2026-03-16 at 10.31.27 AM.png>)

![![alt text](<Screenshot 2026-03-16 at 10.31.36 AM.png>)](<public/Screenshot 2026-03-16 at 10.31.36 AM.png>)

![![alt text](<Screenshot 2026-03-16 at 10.32.11 AM.png>)](<public/Screenshot 2026-03-16 at 10.32.11 AM.png>)

5. Upload file modal
   ![![alt text](<Screenshot 2026-03-16 at 10.32.17 AM.png>)](<public/Screenshot 2026-03-16 at 10.32.17 AM.png>)

![![alt text](<Screenshot 2026-03-16 at 10.32.43 AM.png>)](<public/Screenshot 2026-03-16 at 10.32.43 AM.png>)

## License

MIT
