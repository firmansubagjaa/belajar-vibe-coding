# Planning: Fitur Login User

## Tujuan

Menambahkan tabel `sessions` dan endpoint API untuk login user. Saat login berhasil, server membuat token (UUID), menyimpannya di tabel `sessions`, lalu mengembalikan token tersebut ke client.

## Konteks Project Saat Ini

Baca file-file ini dulu sebelum mulai:

- `src/index.ts`: entry point server (framework **Hono**). Router users sudah dipasang di sini dengan `app.route("/api/users", usersRoute)`
- `src/routes/users-route.ts`: router users. Sudah ada `POST /` untuk registrasi
- `src/services/users-service.ts`: logika bisnis users. Sudah ada fungsi `registerUser`
- `src/schema.ts`: skema Drizzle. Sudah ada tabel `users` dan `posts`
- `src/db.ts`: koneksi Drizzle ke PostgreSQL Supabase (`export const db`)
- `drizzle/`: folder migrasi. Sudah ada `0000_mute_crystal.sql` dan `0001_alter_users.sql`
- `drizzle/meta/_journal.json`: daftar migrasi yang dikenali Drizzle

Hal yang perlu diperhatikan:

- Password di tabel `users` disimpan sebagai hash bcrypt, dibuat dengan `Bun.password.hash`. Untuk mencocokkan password saat login, gunakan pasangannya: `Bun.password.verify`.
- Di database sudah ada user untuk testing: email `eko@localhost`, password `rahasia`.
- **Jangan jalankan `bun run generate`.** Snapshot Drizzle di `drizzle/meta/` belum mencatat migrasi `0001`, jadi perintah ini akan bertanya secara interaktif dan membuat ulang perubahan tabel `users` yang sudah diterapkan, sehingga migrasi gagal. Buat file migrasi secara manual (lihat Tahap 2).
- Endpoint registrasi (`POST /api/users`) dan endpoint lama (`/health`, `/users`, `/posts`) harus tetap berfungsi.

## Spesifikasi

### Tabel `sessions`

| Kolom      | Tipe         | Aturan                                   |
|------------|--------------|------------------------------------------|
| id         | integer      | auto increment, primary key              |
| token      | varchar(255) | not null, berisi UUID token user login   |
| user_id    | integer      | not null, foreign key ke `users.id`      |
| created_at | timestamp    | default current_timestamp                |

Catatan:

- Nama tabel memakai `sessions` (jamak) supaya konsisten dengan `users` dan `posts`.
- `user_id` dibuat `not null` karena session tanpa user tidak ada artinya.
- Untuk kolom `user_id` di Drizzle, gunakan tipe `integer`, **bukan** `serial`. `serial` hanya untuk kolom id yang auto increment.

### Endpoint Login

`POST /api/users/login`

Request body:

```json
{
  "email": "eko@localhost",
  "password": "rahasia"
}
```

Response sukses:

```json
{
  "data": "token"
}
```

`"token"` di atas adalah contoh. Isinya adalah UUID yang baru dibuat, misalnya `"3f2b8c1e-9a4d-4e6f-b1c2-7d8e9f0a1b2c"`.

Response error (email tidak ditemukan **atau** password salah):

```json
{
  "error": "Email atau password salah"
}
```

### Struktur Folder di `src`

- `src/routes/`: berisi definisi routing. Format nama file: `users-route.ts`
- `src/services/`: berisi logika bisnis. Format nama file: `users-service.ts`

Fitur login masih bagian dari users, jadi **tambahkan ke file yang sudah ada**. Jangan buat file route/service baru.

## Tahapan Implementasi

### 1. Tambah skema tabel `sessions`

- Di `src/schema.ts`, tambahkan definisi tabel `sessions` sesuai spesifikasi.
- `token` pakai `varchar` panjang 255, `user_id` pakai `integer` dengan `.references(() => users.id)`.
- Jangan ubah definisi tabel `users` atau `posts`.

### 2. Buat migrasi secara manual

- Buat file `drizzle/0002_create_sessions.sql` berisi SQL `CREATE TABLE "sessions"` dengan kolom sesuai spesifikasi, ditambah `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` untuk `user_id` ke `users(id)`. Contoh format bisa dilihat di `drizzle/0000_mute_crystal.sql`.
- Tambahkan entry baru di `drizzle/meta/_journal.json`:
  - `idx`: 2
  - `tag`: `0002_create_sessions` (harus sama persis dengan nama file tanpa `.sql`)
  - `when`: angka timestamp yang lebih besar dari entry sebelumnya
  - `version` dan `breakpoints`: samakan dengan entry lain
- Jalankan `bun run migrate`.
- Kalau migrate berhasil tapi tabel tidak muncul, cek lagi apakah entry journal sudah benar. Migrasi yang tidak tercatat di journal akan diabaikan.

### 3. Tambah fungsi login di service

- Di `src/services/users-service.ts`, tambahkan fungsi baru untuk login yang menerima `email` dan `password`. Alurnya:
  1. Cari user berdasarkan email.
  2. Kalau user tidak ditemukan, lempar error dengan pesan `Email atau password salah`.
  3. Cocokkan password dari request dengan hash di database memakai `Bun.password.verify`.
  4. Kalau tidak cocok, lempar error dengan pesan yang **sama persis**: `Email atau password salah`.
  5. Buat token UUID dengan `crypto.randomUUID()` (bawaan Bun, tidak perlu install apa pun).
  6. Simpan token dan `user_id` ke tabel `sessions`.
  7. Kembalikan token.
- Pesan error untuk email salah dan password salah harus sama. Tujuannya supaya orang luar tidak bisa menebak email mana yang terdaftar.
- Seperti `registerUser`, service tidak boleh mengurus HTTP (status code atau format response).

### 4. Tambah route login

- Di `src/routes/users-route.ts`, tambahkan handler `POST /login` di router yang sudah ada.
- Karena router sudah dipasang di `/api/users`, path `/login` otomatis menjadi `/api/users/login`. **Tidak perlu** mengubah `src/index.ts`.
- Alur handler:
  1. Ambil body JSON dari request.
  2. Kalau `email` atau `password` kosong, kembalikan error dengan status 400.
  3. Panggil fungsi login dari service.
  4. Kalau sukses, kembalikan `{ "data": "<token>" }`.
  5. Kalau service melempar error `Email atau password salah`, kembalikan `{ "error": "Email atau password salah" }` dengan status HTTP 401.
  6. Error lain: kembalikan status 500 dan log error-nya ke console.
- Ikuti pola handler registrasi yang sudah ada di file yang sama.

### 5. Verifikasi

Jalankan server (`bun run dev`), lalu tes manual dengan HTTP client:

1. `POST /api/users/login` dengan email `eko@localhost` dan password `rahasia`. Harus dapat `{ "data": "<uuid>" }`.
2. Login lagi dengan password salah. Harus dapat `{ "error": "Email atau password salah" }` dengan status 401.
3. Login dengan email yang tidak terdaftar. Harus dapat pesan error yang sama dengan status 401.
4. Login dua kali dengan data benar. Token yang didapat harus berbeda setiap kali.
5. Cek tabel `sessions` di dashboard Supabase: ada baris baru dengan token yang sama seperti response, dan `user_id` sesuai id user Eko.
6. Pastikan `POST /api/users` (registrasi) dan `GET /health` masih jalan.

Catatan untuk Windows PowerShell: perintah `curl` di PowerShell adalah alias `Invoke-WebRequest` dan tidak menerima flag `-X`. Gunakan `Invoke-WebRequest -UseBasicParsing`, `curl.exe`, atau HTTP client seperti Postman.

## Kriteria Selesai

- Tabel `sessions` ada di Supabase sesuai spesifikasi, dengan foreign key ke `users`
- Fungsi login ada di `src/services/users-service.ts`
- Route `POST /login` ada di `src/routes/users-route.ts`
- Login benar mengembalikan `{ "data": "<uuid>" }` dan menyimpan session ke database
- Email atau password salah mengembalikan `{ "error": "Email atau password salah" }` dengan status 401
- Fitur registrasi dan endpoint lama tetap berfungsi

## Di Luar Cakupan

- Middleware untuk mengecek token di endpoint lain
- Logout (menghapus session)
- Masa berlaku token (expired)
- Memperbaiki snapshot Drizzle di `drizzle/meta/` (sebaiknya jadi issue terpisah)
