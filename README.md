# Ride API

Express + TypeScript + MongoDB (Mongoose) backend for the MiCoach monorepo.

## Setup

1. `cd Micoach-BE`
2. `npm install`
3. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, and optionally `CLIENT_ORIGINS`, `PORT`, `API_PUBLIC_URL`.

## Scripts

- `npm run dev` — `nodemon` restarts the server when `src` changes (runs via `tsx`)
- `npm run build` — compile to `dist/`
- `npm start` — run compiled app

## API documentation

See **[api.md](api.md)** for full endpoint list, request bodies, and `curl` examples (user/captain auth, uploads, users CRUD, trips).

Summary:

- `GET /health` — liveness
- `GET /api/v1` — service metadata
- **Auth:** `POST /api/v1/auth/register/user`, `POST /api/v1/auth/login/user`, captain step1/step2 and login under `/api/v1/auth/register/captain/...` and `/api/v1/auth/login/captain`
- **Users:** `GET /api/v1/users/me`, CRUD under `/api/v1/users` (admin rules apply for list/create/delete)
- **Trips:** `GET` / `POST /api/v1/trips` — JWT required

## Security

Keep secrets only in `.env`. Rotate database credentials if they were ever committed or shared.
# rideBE
