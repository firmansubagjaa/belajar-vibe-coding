# Planning: Fitur Registrasi User

## Tujuan

Menambahkan tabel `users` (versi baru dengan kolom password) dan endpoint API untuk registrasi user baru.

## Konteks Project Saat Ini

Baca file-file ini dulu sebelum mulai:

- `src/index.ts`: entry point server (framework **Hono**, semua route saat ini masih ditulis langsung di sini)
- `src/db.ts`: koneksi Drizzle ke PostgreSQL Supabase (`export const db`)
- `src/schema.ts`: skema Drizzle. Sudah ada tabel `users` dan `posts`
- `drizzle.config.ts`: konfigurasi Drizzle Kit (output migrasi ke folder `drizzle/`)
- `package.json`: script `generate` (buat migrasi) dan `migrate` (terapkan migrasi)

Hal yang perlu diperhatikan:

- Tabel `users` **sudah ada** di database, tapi strukturnya berbeda (kolom `name`/`email` bertipe `text`, ada `updated_at`, belum ada `password`). Tabel ini harus **diubah**, bukan dibuat ulang dari nol.
- Tabel `posts` punya foreign key `author_id` ke `users.id`. Jangan hapus tabel `users` dengan cara yang merusak relasi ini.
- Database sudah berisi data contoh (user "John Doe" dan satu post). Menambah kolom `password NOT NULL` akan gagal kalau ada baris lama tanpa password. Hapus dulu data contoh tersebut (ini data testing, aman dihapus), atau tanyakan ke reviewer jika ragu.

## Spesifikasi

### Tabel `users`

| Kolom      | Tipe           | Aturan                              |
|------------|----------------|-------------------------------------|
| id         | integer        | auto increment, primary key         |
| name       | varchar(255)   | not null                            |
| email      | varchar(255)   | not null, unique                    |
| password   | varchar(255)   | not null, berisi hash bcrypt        |
| created_at | timestamp      | default current_timestamp           |

Catatan: `unique` pada email dipertahankan (sudah ada sekarang) sebagai pengaman tambahan, walaupun pengecekan email duplikat tetap dilakukan di service.

### Endpoint Registrasi

`POST /api/users`

Request body:

```json
{
  "name": "Eko",
  "email": "eko@localhost",
  "password": "rahasia"
}
```

Response sukses:

```json
{
  "data": "OK"
}
```

Response error (email sudah dipakai):

```json
{
  "error": "Email sudah terdaftar"
}
```

### Struktur Folder di `src`

- `src/routes/`: berisi definisi routing. Format nama file: `users-route.ts`
- `src/services/`: berisi logika bisnis. Format nama file: `users-service.ts`

## Tahapan Implementasi

### 1. Siapkan dependency bcrypt

- Bun sudah punya fungsi hashing bawaan (`Bun.password.hash` dan `Bun.password.verify`) yang mendukung algoritma bcrypt. Gunakan ini dengan opsi algoritma `bcrypt`, jadi tidak perlu install library tambahan.
- Kalau memilih library lain, pastikan hasilnya tetap hash bcrypt dan versi dependency di-pin.

### 2. Ubah skema tabel `users`

- Edit definisi `users` di `src/schema.ts` agar sesuai tabel spesifikasi di atas:
  - `name` dan `email` jadi `varchar` panjang 255
  - tambah kolom `password` varchar 255 not null
  - hapus kolom `updated_at`
- Sesuaikan kode lain yang masih memakai kolom `updatedAt` milik users (cek endpoint update user di `src/index.ts`) supaya tidak error saat compile.
- Tabel `posts` tidak perlu diubah.

### 3. Buat dan terapkan migrasi

- Hapus data contoh lama di tabel `posts` dan `users` (lihat bagian Konteks).
- Jalankan `bun run generate` untuk membuat file migrasi baru di folder `drizzle/`.
- Periksa isi file SQL yang dihasilkan: pastikan isinya `ALTER TABLE` (mengubah tabel), bukan `DROP TABLE`.
- Jalankan `bun run migrate` untuk menerapkan ke Supabase.

### 4. Buat service registrasi

- Buat file `src/services/users-service.ts`.
- Buat satu fungsi untuk registrasi user yang menerima `name`, `email`, `password`. Alurnya:
  1. Cari user berdasarkan email di database.
  2. Kalau sudah ada, lempar error dengan pesan `Email sudah terdaftar`.
  3. Kalau belum ada, hash password dengan bcrypt.
  4. Simpan user baru (name, email, password hasil hash) ke database.
- Service **tidak boleh** tahu apa-apa soal HTTP (tidak mengurus status code atau format response). Itu tugas route.

### 5. Buat route registrasi

- Buat file `src/routes/users-route.ts`.
- Buat instance router Hono khusus untuk users, lalu definisikan `POST /` di dalamnya.
- Alur handler:
  1. Ambil body JSON dari request.
  2. Panggil fungsi registrasi dari service.
  3. Kalau sukses, kembalikan `{ "data": "OK" }`.
  4. Kalau service melempar error email terdaftar, kembalikan `{ "error": "Email sudah terdaftar" }` dengan status HTTP 400.
- Export router ini supaya bisa dipasang di `src/index.ts`.

### 6. Pasang route ke server

- Di `src/index.ts`, daftarkan router users di path `/api/users`.
- Endpoint lama (`/users`, `/posts`, `/health`) biarkan saja, jangan dihapus atau dipindah di tugas ini.

### 7. Verifikasi

Jalankan server (`bun run dev`), lalu tes manual dengan HTTP client:

1. Kirim `POST /api/users` dengan body contoh. Harus dapat `{ "data": "OK" }`.
2. Kirim request yang sama sekali lagi. Harus dapat `{ "error": "Email sudah terdaftar" }`.
3. Cek tabel `users` di dashboard Supabase: kolom `password` harus berisi hash (diawali `$2`), **bukan** teks `rahasia`.
4. Pastikan endpoint lama seperti `GET /health` masih jalan.

## Kriteria Selesai

- Tabel `users` di Supabase sesuai spesifikasi
- File `src/routes/users-route.ts` dan `src/services/users-service.ts` ada dan dipakai
- Registrasi sukses mengembalikan `{ "data": "OK" }`
- Email duplikat mengembalikan `{ "error": "Email sudah terdaftar" }`
- Password tersimpan dalam bentuk hash bcrypt
- Server jalan tanpa error

## Di Luar Cakupan

- Login dan autentikasi (JWT/session)
- Validasi format email atau panjang password (boleh ditambahkan nanti sebagai issue terpisah)
- Refactor endpoint lama ke struktur routes/services
