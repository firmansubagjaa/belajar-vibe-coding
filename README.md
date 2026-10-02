# belajar-vibe-coding

API project menggunakan Bun, Hono (web framework), Drizzle ORM, dan Supabase PostgreSQL.

## Prerequisites

- Bun terpasang ([Install Bun](https://bun.sh))
- Akun Supabase dan project PostgreSQL aktif
- Connection string Supabase dari dashboard

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Konfigurasi Environment Variables

Buat file `.env` berdasarkan `.env.example`:

```bash
# .env
DATABASE_URL=postgresql://user:password@your_project.supabase.co:5432/postgres
PORT=3000
```

Ganti `user`, `password`, dan `your_project` dengan kredensial Supabase kamu.

### 3. Generate dan Apply Migrasi Database

Drizzle akan membuat tabel `users` dan `posts` secara otomatis:

```bash
bun run generate
bun run migrate
```

### 4. Jalankan Server

Development mode (dengan watch):

```bash
bun run dev
```

Production mode:

```bash
bun run start
```

Server akan berjalan di `http://localhost:3000`.

## API Endpoints

### Health Check

- `GET /health` — Verifikasi server berjalan

### Users

- `GET /users` — Dapatkan semua users
- `GET /users/:id` — Dapatkan user by ID
- `POST /users` — Buat user baru
  - Body: `{ name, email }`
- `PUT /users/:id` — Update user
  - Body: `{ name, email }`
- `DELETE /users/:id` — Hapus user

### Posts

- `GET /posts` — Dapatkan semua posts
- `GET /posts/:id` — Dapatkan post by ID
- `POST /posts` — Buat post baru
  - Body: `{ title, content, authorId }`
- `PUT /posts/:id` — Update post
  - Body: `{ title, content }`
- `DELETE /posts/:id` — Hapus post

## Project Structure

```
src/
  ├── index.ts       — Server dan endpoint definitions
  ├── db.ts          — Koneksi Drizzle ke database
  └── schema.ts      — Skema tabel database

drizzle/            — Generated migrations
drizzle.config.ts   — Konfigurasi Drizzle Kit
.env.example        — Contoh environment variables
```

## Tech Stack

- **Bun** — JavaScript runtime yang cepat
- **Hono** — Lightweight web framework
- **Drizzle ORM** — TypeScript ORM dengan query builder
- **PostgreSQL** — Database (via Supabase)

## Verifikasi

Untuk test endpoint, jalankan:

```bash
curl http://localhost:3000/health
```

Atau gunakan HTTP client favorit kamu (Postman, Insomnia, vs2Code REST Client).
