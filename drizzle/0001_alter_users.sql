-- Ubah tabel users: tambah kolom password, hapus updated_at, ubah tipe kolom
ALTER TABLE "users" ADD COLUMN "password" varchar(255) NOT NULL;
ALTER TABLE "users" DROP COLUMN "updated_at";
ALTER TABLE "users" ALTER COLUMN "name" TYPE varchar(255);
ALTER TABLE "users" ALTER COLUMN "email" TYPE varchar(255);
