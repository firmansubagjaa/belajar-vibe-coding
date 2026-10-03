# Planning: API Get Current User

## Tujuan

Menambahkan endpoint untuk mengambil data user yang sedang login, berdasarkan token yang dikirim lewat header `Authorization`.

## Konteks Project Saat Ini

Baca file-file ini dulu sebelum mulai:

- `src/index.ts`: entry point server (framework **Hono**). Router users dipasang dengan `app.route("/api/users", usersRoute)`
- `src/routes/users-route.ts`: router users. Sudah ada `POST /` (registrasi) dan `POST /login` (login)
- `src/services/users-service.ts`: logika bisnis users. Sudah ada `registerUser` dan `loginUser`
- `src/schema.ts`: skema Drizzle. Ada tabel `users`, `sessions`, dan `posts`
- `src/db.ts`: koneksi Drizzle ke PostgreSQL Supabase (`export const db`)

Hal yang perlu diperhatikan:

- **Token disimpan di tabel `sessions`, bukan di tabel `users`.** Saat login, `loginUser` membuat UUID dan menyimpannya di `sessions.token` bersama `sessions.user_id`. Jadi untuk tahu siapa pemilik token, cari di `sessions` lalu ambil user dari `users` berdasarkan `user_id`.
- Untuk testing, dapatkan token dulu lewat `POST /api/users/login` dengan email `eko@localhost` dan password `rahasia`.
- Fitur ini **tidak butuh perubahan database** dan tidak butuh migrasi. Jangan jalankan `bun run generate` atau `bun run migrate`.
- Endpoint registrasi, login, dan endpoint lama (`/health`, `/users`, `/posts`) harus tetap berfungsi.

## Spesifikasi

### Endpoint

`GET /api/users/current`

Header:

```
Authorization: Bearer <token>
```

`<token>` adalah token UUID yang didapat dari response login.

Response sukses (status 200):

```json
{
  "data": {
    "id": 1,
    "name": "eko",
    "email": "eko@localhost",
    "created_at": "2026-10-03T04:47:44.000Z"
  }
}
```

Catatan format response:

- Field tanggal harus bernama `created_at` (snake_case). Drizzle mengembalikan field ini sebagai `createdAt`, jadi harus dipetakan secara manual.
- **Jangan pernah** sertakan field `password` di response.

Response error (status 401):

```json
{
  "error": "Unauthorized"
}
```

Error ini dikembalikan untuk semua kasus berikut:

- Header `Authorization` tidak dikirim
- Format header bukan `Bearer <token>`
- Token tidak ditemukan di tabel `sessions`
- User pemilik token sudah tidak ada

### Struktur Folder di `src`

- `src/routes/`: berisi definisi routing. Format nama file: `users-route.ts`
- `src/services/`: berisi logika bisnis. Format nama file: `users-service.ts`

Fitur ini masih bagian dari users, jadi **tambahkan ke file yang sudah ada**. Jangan buat file baru.

## Tahapan Implementasi

### 1. Tambah fungsi get current user di service

- Di `src/services/users-service.ts`, tambahkan fungsi baru yang menerima `token` (string). Alurnya:
  1. Cari baris di tabel `sessions` yang `token`-nya sama dengan token dari parameter.
  2. Kalau tidak ditemukan, lempar error dengan pesan `Unauthorized`.
  3. Ambil user dari tabel `users` berdasarkan `user_id` dari session tersebut.
  4. Kalau user tidak ditemukan, lempar error dengan pesan `Unauthorized`.
  5. Kembalikan objek berisi `id`, `name`, `email`, dan `created_at`. Jangan sertakan `password`.
- Langkah 1 dan 3 boleh digabung menjadi satu query dengan `innerJoin` antara `sessions` dan `users`. Pilih cara yang paling mudah dipahami.
- Seperti fungsi lain di file ini, service tidak boleh mengurus HTTP (tidak membaca header, tidak mengatur status code).

### 2. Tambah route `GET /current`

- Di `src/routes/users-route.ts`, tambahkan handler `GET /current` di router yang sudah ada.
- Karena router dipasang di `/api/users`, path `/current` otomatis menjadi `/api/users/current`. **Tidak perlu** mengubah `src/index.ts`.
- Alur handler:
  1. Baca header `Authorization` dengan `c.req.header("Authorization")`.
  2. Kalau header kosong atau tidak diawali `Bearer ` (dengan spasi), langsung kembalikan `{ "error": "Unauthorized" }` status 401.
  3. Ambil token dengan membuang awalan `Bearer `. Kalau hasilnya kosong, kembalikan 401.
  4. Panggil fungsi service dengan token tersebut.
  5. Kalau sukses, kembalikan `{ "data": <hasil service> }`.
  6. Kalau service melempar error `Unauthorized`, kembalikan `{ "error": "Unauthorized" }` status 401.
  7. Error lain: log ke console dan kembalikan status 500.
- Ikuti pola handler registrasi dan login yang sudah ada di file yang sama.

### 3. Verifikasi

Jalankan server (`bun run dev`), lalu tes manual:

1. Login dengan `POST /api/users/login` (email `eko@localhost`, password `rahasia`) untuk mendapatkan token.
2. `GET /api/users/current` dengan header `Authorization: Bearer <token>`. Harus dapat data user Eko dengan field `id`, `name`, `email`, `created_at`, dan **tanpa** `password`.
3. `GET /api/users/current` tanpa header `Authorization`. Harus dapat `{ "error": "Unauthorized" }` status 401.
4. Kirim token acak yang tidak ada di database (misalnya `Bearer abc123`). Harus dapat 401.
5. Kirim header tanpa awalan `Bearer` (misalnya hanya token-nya saja). Harus dapat 401.
6. Pastikan registrasi, login, dan `GET /health` masih jalan.

Contoh perintah PowerShell untuk langkah 2:

```powershell
$headers = @{ Authorization = "Bearer <token>" }
Invoke-WebRequest -Uri "http://localhost:3000/api/users/current" -Headers $headers -UseBasicParsing
```

Catatan: di Windows PowerShell, `curl` adalah alias `Invoke-WebRequest` dan tidak menerima flag `-H`/`-X`. Gunakan contoh di atas, `curl.exe`, atau Postman.

## Kriteria Selesai

- Fungsi get current user ada di `src/services/users-service.ts`
- Route `GET /current` ada di `src/routes/users-route.ts`
- Token valid mengembalikan data user dengan format sesuai spesifikasi, tanpa password
- Semua kasus token tidak valid mengembalikan `{ "error": "Unauthorized" }` status 401
- Registrasi, login, dan endpoint lama tetap berfungsi

## Di Luar Cakupan

- Middleware autentikasi yang bisa dipakai ulang di endpoint lain
- Logout (menghapus session)
- Masa berlaku token (expired)
