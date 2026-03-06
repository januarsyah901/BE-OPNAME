# Scrum Sprint Plan — 10 Minggu

## AutoService Inventory Web Panel

> **Metode:** Scrum | **Durasi Sprint:** 1 Minggu | **Total Sprint:** 10
> **Tim:** 4 Orang (PM, FE Dev, BE Dev, UI/UX)
> **Laporan:** Setiap akhir sprint ke Asisten Praktikum
> **Last Updated:** 2026-03-06

---

## Tim & Role

| Role       | Tugas Utama                                                  |
| ---------- | ------------------------------------------------------------ |
| **PM**     | Sprint planning, backlog, koordinasi, laporan ke asdos, ERD  |
| **FE Dev** | Semua halaman & komponen UI, mock data, integrasi API BE     |
| **BE Dev** | REST API, database schema, WA notification service, auth/JWT |
| **UI/UX**  | Wireframe, Figma design, review konsistensi visual           |

---

## Scrum Ceremonies (Setiap Minggu)

| Ceremony                 | Kapan         | Durasi   | Output                           |
| ------------------------ | ------------- | -------- | -------------------------------- |
| **Sprint Planning**      | Senin pagi    | 1-2 jam  | Sprint backlog per orang         |
| **Daily Standup**        | Setiap hari   | 15 menit | Update progress & blocker        |
| **Sprint Review**        | Jumat sore    | 1 jam    | Demo fitur ke tim                |
| **Sprint Retrospective** | Jumat sore    | 30 menit | What went well / what to improve |
| **Laporan Asdos**        | Jumat / Sabtu | -        | Dokumen laporan mingguan         |

---

## Catatan Penting (Disclaimer Internal)

> 🔒 **FE sudah selesai 100%** menggunakan mock data sejak awal sprint.
> Laporan ke asdos tetap mengikuti timeline sprint seperti biasa.
> Realisasi FE yang lebih cepat dijadikan buffer untuk membantu koordinasi BE dan integrasi API.

---

## Sprint Timeline

### ✅ Sprint 1 — Minggu 1: Fondasi & Setup
> **Status: DONE**

**Goal:** Proyek bisa jalan secara lokal oleh semua anggota

| PIC    | Task                                                    | Est. | Status |
| ------ | ------------------------------------------------------- | ---- | ------ |
| PM     | Finalisasi scope, buat product backlog (Trello/Notion)  | S    | `Done` |
| UI/UX  | Buat wireframe low-fi: Dashboard, Inventory, Login      | M    | `Done` |
| BE Dev | Setup project BE (Express.js + TypeScript + Prisma ORM) | M    | `Done` |
| BE Dev | Konfigurasi database Supabase PostgreSQL + `.env`       | S    | `Done` |
| BE Dev | Setup Swagger UI (swagger-jsdoc + swagger-ui-express)   | S    | `Done` |
| BE Dev | Deploy awal ke Vercel + konfigurasi `vercel.json`        | S    | `Done` |
| FE Dev | Setup Next.js, Tailwind, struktur folder `src/`         | S    | `Done` |
| FE Dev | Layout utama: Sidebar, Header, navigasi (role-based)    | M    | `Done` |

**Deliverable Laporan Asdos:**

- [x] Repo sudah dibuat & semua anggota bisa clone
- [x] ERD V1 sudah disetujui PM (lihat `docs/ERD_DATABASE.md`)
- [x] Project BE bisa jalan lokal (`npm run dev`)
- [x] Swagger UI dapat diakses di `/api/docs`

**Catatan BE:**
- Framework: Express.js + TypeScript
- ORM: Prisma (pull schema dari Supabase)
- Deployment: Vercel Serverless

---

### ✅ Sprint 2 — Minggu 2: Auth & User Management
> **Status: DONE**

**Goal:** User bisa login, role-based, navigasi sidebar berfungsi

| PIC    | Task                                                             | Est. | Status |
| ------ | ---------------------------------------------------------------- | ---- | ------ |
| BE Dev | Schema DB: tabel `users` + migrasi Prisma                        | S    | `Done` |
| BE Dev | Seeder: user owner, admin, kasir (bcrypt hash password)          | S    | `Done` |
| BE Dev | `POST /auth/login` — JWT sign, validasi username + password      | M    | `Done` |
| BE Dev | `GET /auth/me` — decode token, kembalikan data user              | S    | `Done` |
| BE Dev | `POST /auth/logout`                                              | XS   | `Done` |
| BE Dev | CRUD `GET/POST /users`, `GET/PUT/DELETE /users/:id`              | M    | `Done` |
| BE Dev | Auth middleware JWT (protect semua route kecuali login)          | S    | `Done` |
| FE Dev | Halaman Login (UI + auth logic + protected routes + route guard) | M    | `Done` |
| FE Dev | Sidebar dinamis berdasarkan role + filter nav per permission     | M    | `Done` |
| UI/UX  | High-fi: Login page + Layout utama                               | M    | `Done` |

**Deliverable:**

- [x] Login end-to-end (BE + FE) — JWT berfungsi
- [x] FE: Login UI + sidebar dinamis + route guard sudah siap
- [x] Semua route API diproteksi dengan Bearer Token JWT
- [x] Field login menggunakan `username` (bukan email) sesuai ERD

**Catatan BE:**
- Auth menggunakan `jsonwebtoken` + `bcryptjs`
- Role tersedia: `owner`, `admin`, `kasir` (owner hanya via seeder)
- Token expire: 24 jam (`expires_in: 86400`)

---

### ✅ Sprint 3 — Minggu 3: Inventory — Katalog Sparepart
> **Status: DONE**

**Goal:** Staff bisa CRUD data sparepart & generate barcode

| PIC    | Task                                                             | Est. | Status |
| ------ | ---------------------------------------------------------------- | ---- | ------ |
| BE Dev | Schema DB: `categories`, `spare_parts`                           | S    | `Done` |
| BE Dev | CRUD `GET/POST /categories`, `PUT/DELETE /categories/:id`        | M    | `Done` |
| BE Dev | CRUD `GET/POST /spare-parts`, `GET/PUT/DELETE /spare-parts/:id`  | L    | `Done` |
| BE Dev | Auto-generate SKU format `AS-[PREFIX]-[SEQ]`                     | S    | `Done` |
| BE Dev | Generate & simpan barcode image (barcode_value + barcode_image_url) | M | `Done` |
| BE Dev | `GET /spare-parts/:id/barcode` — ambil URL barcode               | S    | `Done` |
| BE Dev | Filter query: `category_id`, `low_stock`, `search`               | S    | `Done` |
| BE Dev | Soft delete spare part (`deleted_at`)                            | S    | `Done` |
| FE Dev | Halaman Daftar Sparepart — tabel + search + filter               | M    | `Done` |
| FE Dev | Form Tambah/Edit Sparepart (modal)                               | M    | `Done` |
| FE Dev | Generate & Cetak Barcode (modal label)                           | M    | `Done` |

**Deliverable:**

- [x] API CRUD spare parts berfungsi penuh
- [x] SKU auto-generate & barcode tersedia
- [x] Filter low_stock & search berjalan
- [x] FE: Halaman inventory selesai & terintegrasi

---

### ✅ Sprint 4 — Minggu 4: Stok Masuk, Keluar & Opname
> **Status: DONE**

**Goal:** Workflow stok lengkap — restock, pemakaian, dan rekonsiliasi opname

| PIC    | Task                                                              | Est. | Status |
| ------ | ----------------------------------------------------------------- | ---- | ------ |
| BE Dev | Schema DB: `stock_movements`, `stock_opnames`, `stock_opname_items` | M  | `Done` |
| BE Dev | `POST /stock/in` — catat stok masuk, update `current_stock`       | M    | `Done` |
| BE Dev | `POST /stock/out` — stok keluar, validasi stok cukup              | M    | `Done` |
| BE Dev | `GET /stock-movements` — log pergerakan stok (filter type/part)   | S    | `Done` |
| BE Dev | `POST /opnames` — buka sesi opname baru                           | M    | `Done` |
| BE Dev | `POST /opnames/:id/items` — input hitungan fisik per item         | M    | `Done` |
| BE Dev | `PUT /opnames/:id/items/:item_id` — update hitungan               | S    | `Done` |
| BE Dev | `POST /opnames/:id/close` — tutup sesi & apply adjustment otomatis | L   | `Done` |
| BE Dev | Guard: cek `OPNAME_ALREADY_OPEN` sebelum buka sesi baru           | S    | `Done` |
| BE Dev | Guard: cek `STOCK_INSUFFICIENT` sebelum kurangi stok              | S    | `Done` |
| FE Dev | Form Stok Masuk, Form Stok Keluar, Halaman Opname, Riwayat Stok   | L    | `Done` |

**Deliverable:**

- [x] API stok masuk/keluar berfungsi dengan validasi
- [x] Sesi opname bisa dibuka, diisi, dan ditutup
- [x] Adjustment stok otomatis saat opname ditutup
- [x] Log pergerakan stok tercatat di `stock_movements`
- [x] FE: Semua halaman stok selesai & terintegrasi

**Catatan BE:**
- Type stock_movements: `masuk | keluar | opname_adjustment`
- Menutup opname men-generate `stock_movements` type `opname_adjustment` untuk semua item yang ada selisih

---

### ✅ Sprint 5 — Minggu 5: Customer, Kendaraan & Work Order
> **Status: DONE**

**Goal:** Staff bisa data customer, kendaraan, & penerimaan kendaraan via Work Order

| PIC    | Task                                                          | Est. | Status |
| ------ | ------------------------------------------------------------- | ---- | ------ |
| BE Dev | Schema DB: `customers`, `vehicles`, `work_orders`             | M    | `Done` |
| BE Dev | CRUD `GET/POST /customers`, `GET/PUT/DELETE /customers/:id`   | M    | `Done` |
| BE Dev | `GET /customers/:id/history` — riwayat servis customer        | M    | `Done` |
| BE Dev | Soft delete customer (`deleted_at`)                           | S    | `Done` |
| BE Dev | CRUD kendaraan: `GET/POST /customers/:id/vehicles`            | M    | `Done` |
| BE Dev | `PUT /vehicles/:id` — update data kendaraan                   | S    | `Done` |
| BE Dev | CRUD `/work-orders` — buat, list, detail, update, soft delete | L    | `Done` |
| BE Dev | `PATCH /work-orders/:id/status` — update status WO            | M    | `Done` |
| BE Dev | `PATCH /work-orders/:id/mechanic` — assign mekanik            | S    | `Done` |
| BE Dev | Trigger notif WA saat status WO → `dikerjakan` / `selesai`    | M    | `Done` |
| FE Dev | Customer, kendaraan, antrean (Work Order) selesai             | L    | `Done` |

**Deliverable:**

- [x] API customer & kendaraan berfungsi penuh
- [x] API Work Order CRUD + update status berfungsi
- [x] Notif WA otomatis ke pelanggan saat status WO berubah
- [x] FE: Customer, kendaraan & antrean selesai & terintegrasi

**Catatan BE:**
- Status WO: `menunggu → dikerjakan → menunggu_sparepart → selesai`
- Notif WA hanya dikirim jika pelanggan punya nomor HP

---

### ✅ Sprint 6 — Minggu 6: Transaksi & Notifikasi WA
> **Status: DONE**

**Goal:** Kasir bisa buat nota servis; owner terima WA otomatis saat stok menipis

| PIC    | Task                                                              | Est. | Status |
| ------ | ----------------------------------------------------------------- | ---- | ------ |
| BE Dev | Schema DB: `transactions`, `transaction_items`, `wa_notifications` | M   | `Done` |
| BE Dev | `POST /transactions` + otomatis kurangi stok & auto invoice_number | L   | `Done` |
| BE Dev | `GET/GET-detail /transactions`                                    | M    | `Done` |
| BE Dev | `PATCH /transactions/:id/payment` — update status & jumlah bayar  | S    | `Done` |
| BE Dev | Integrasi **WhatsApp Web.js** (bukan gateway pihak ketiga)        | L    | `Done` |
| BE Dev | `wa-worker.ts` — polling `wa_notifications` setiap 15 detik       | M    | `Done` |
| BE Dev | Trigger cek `minimum_stock` saat stok berubah → insert notif WA   | M    | `Done` |
| BE Dev | Notif WA progress servis saat status Work Order berubah           | M    | `Done` |
| BE Dev | Tabel `wa_notifications` + log status sent/failed/pending         | S    | `Done` |
| BE Dev | Endpoint manajemen WA: `/notifications/wa/status`, `/qr`, `/restart`, `/test`, `/retry/:id` | M | `Done` |
| FE Dev | Kasir: Riwayat Transaksi, Buat Nota, POS Cepat, Invoice           | L    | `Done` |
| FE Dev | Log Notifikasi WA + Dashboard Alert stok menipis                  | S    | `Done` |

**Deliverable:**

- [x] API transaksi berfungsi — stok otomatis berkurang
- [x] Invoice number auto-generate (`INV-YYYYMMDD-NNN`)
- [x] Payment status: `lunas | dp | belum_bayar`
- [x] WA Web.js terintegrasi — notif stok & progress servis berjalan
- [x] WA Worker berjalan terpisah via `npm run wa:worker`
- [x] FE: Kasir & notifikasi selesai & terintegrasi

**Catatan BE:**
- WA menggunakan `whatsapp-web.js` (bukan Fonnte/Wablas)
- Arsitektur hybrid: Vercel (REST API) + lokal (WA Worker)
- Session WA disimpan di `.wwebjs_auth/` (di-gitignore)

---

### ✅ Sprint 7 — Minggu 7: Reports & Settings
> **Status: DONE**

**Goal:** Owner bisa lihat laporan omset; bengkel bisa dikonfigurasi

| PIC    | Task                                                                  | Est. | Status |
| ------ | --------------------------------------------------------------------- | ---- | ------ |
| BE Dev | Schema DB: `bengkel_profile` (settings bengkel)                       | S    | `Done` |
| BE Dev | `GET /reports/revenue?period=daily/monthly&date=...`                  | L    | `Done` |
| BE Dev | `GET /reports/top-products?limit=10`                                  | M    | `Done` |
| BE Dev | `GET /reports/low-stock`                                              | S    | `Done` |
| BE Dev | `GET /reports/opname/:id` — rekap hasil opname                        | M    | `Done` |
| BE Dev | `GET /settings` & `PUT /settings` — profil + konfigurasi bengkel      | M    | `Done` |
| FE Dev | Dashboard + Laporan Keuangan + Laporan Analitik                       | L    | `Done` |
| FE Dev | Pengaturan bengkel (profil, WA config)                                | S    | `Done` |

**Deliverable:**

- [x] API reports berfungsi — revenue, top products, low stock, opname recap
- [x] API settings berfungsi — get & update profil bengkel
- [x] FE: Dashboard & laporan terintegrasi dengan data real

---

### ✅ Sprint 8 — Minggu 8: Swagger, CORS & Deployment
> **Status: DONE**

**Goal:** API terdokumentasi lengkap, aman, dan bisa diakses dari domain FE production

| PIC    | Task                                                                    | Est. | Status |
| ------ | ----------------------------------------------------------------------- | ---- | ------ |
| BE Dev | Update schema DB — rename field & tabel sesuai ERD final                | M    | `Done` |
| BE Dev | Update seeder sesuai schema baru                                        | S    | `Done` |
| BE Dev | Swagger docs lengkap: semua endpoint + schema + contoh response         | L    | `Done` |
| BE Dev | Tambah modul **Work Orders** ke Swagger                                 | M    | `Done` |
| BE Dev | Tambah modul **Service Catalog** ke Swagger                             | M    | `Done` |
| BE Dev | Update Notifications Swagger (WA client management endpoints)           | M    | `Done` |
| BE Dev | Fix Swagger mount: dipindah ke `/api/docs` (bug: intercept request API) | M    | `Done` |
| BE Dev | CORS whitelist domain production `https://auto-service-jet.vercel.app`  | S    | `Done` |
| BE Dev | Dokumentasi FE: `docs/FRONTEND_API_GUIDE.md`                            | M    | `Done` |
| BE Dev | Update `docs/API_SPEC.md` sync dengan implementasi aktual               | S    | `Done` |

**Deliverable:**

- [x] Swagger UI live di `https://be-opname.vercel.app/api/docs`
- [x] OpenAPI JSON di `/api/docs.json`
- [x] CORS dikonfigurasi — hanya domain whitelist yang bisa akses
- [x] Dokumentasi FE tersedia di `docs/FRONTEND_API_GUIDE.md`
- [x] Semua endpoint sudah sesuai `API_SPEC.md` & `ERD_DATABASE.md`

**Bug Fixed:**
- ⚠️ `swaggerUi.serve` di-mount di `'/'` → intercept semua request API → dikembalikan HTML. **Fix:** pindah ke `/api/docs` & mount SETELAH route API.

---

### 🟦 Sprint 9 — Minggu 9: Integrasi BE–FE
> **Status: In Progress**

**Goal:** Semua fitur MVP terhubung ke API BE yang sudah live

| PIC    | Task                                                   | Est. | Status        |
| ------ | ------------------------------------------------------ | ---- | ------------- |
| BE Dev | Finalisasi semua endpoint, bug fix dari hasil integrasi| M    | `In Progress` |
| BE Dev | Implementasi CRUD `/service-catalog` (controller + route) | M | `Todo`      |
| BE Dev | `GET /transactions/:id/pdf` — generate PDF nota        | M    | `Todo`        |
| FE Dev | Ganti semua mock fetch → API call (`src/lib/api.ts`)   | L    | `In Progress` |
| FE Dev | Handle loading state, error handling, toast notif      | M    | `In Progress` |
| FE Dev | Test integrasi setiap modul                            | M    | `Todo`        |
| UI/UX  | Review konsistensi visual semua halaman                | M    | `Todo`        |

**Deliverable:**

- [ ] Semua fitur P1 berjalan dengan data real dari BE
- [ ] Error handling ada di setiap form
- [ ] Service Catalog CRUD selesai di BE

---

### 🟦 Sprint 10 — Minggu 10: Testing, Polish & Demo
> **Status: Todo**

**Goal:** Sistem stabil, bug kritis 0, siap demo ke stakeholder/asdos

| PIC        | Task                                                  | Est. | Status |
| ---------- | ----------------------------------------------------- | ---- | ------ |
| PM + semua | Full regression test semua fitur MVP                  | L    | `Todo` |
| PM         | UAT bersama: simulasi skenario user nyata             | M    | `Todo` |
| FE Dev     | Fix bug, responsive check (tablet-friendly)           | M    | `Todo` |
| BE Dev     | Fix bug API, optimasi query, security check           | M    | `Todo` |
| UI/UX      | Polish UI akhir: spacing, tipografi, konsistensi ikon | S    | `Todo` |
| PM         | Dokumen final: user manual, flow diagram              | M    | `Todo` |
| PM         | Persiapan & rehearsal demo ke asdos/klien             | M    | `Todo` |

**Deliverable:**

- [ ] Semua fitur MVP P1 berfungsi tanpa bug kritis
- [ ] Demo ready & terdokumentasi

---

## Ringkasan Progress BE Dev

| Sprint | Fokus BE                          | Status     |
| ------ | --------------------------------- | ---------- |
| 1      | Setup project, DB, Swagger, Deploy | ✅ Done   |
| 2      | Auth JWT, User CRUD               | ✅ Done    |
| 3      | Categories, Spare Parts, Barcode  | ✅ Done    |
| 4      | Stock In/Out, Opname              | ✅ Done    |
| 5      | Customer, Vehicle, Work Order     | ✅ Done    |
| 6      | Transaction, WA Web.js            | ✅ Done    |
| 7      | Reports, Settings                 | ✅ Done    |
| 8      | Swagger sync, CORS, Docs          | ✅ Done    |
| 9      | Integrasi, Service Catalog, PDF   | 🔄 In Progress |
| 10     | Testing, Bug Fix, Polish          | ⏳ Todo   |

**Total Endpoint BE Selesai: ~50 endpoint** ✅

---

## Story Point Reference

| Label | Estimasi Waktu           |
| ----- | ------------------------ |
| `XS`  | < 2 jam                  |
| `S`   | 2–4 jam                  |
| `M`   | 4–8 jam (1 hari)         |
| `L`   | 1–2 hari                 |
| `XL`  | > 2 hari (perlu dipecah) |

---

## Template Laporan Mingguan ke Asdos

```markdown
# Laporan Sprint [N] — Minggu ke-[N]

**Tanggal:** [tanggal]
**Tim:** [nama tim] | 4 orang (PM, FE, BE, UI/UX)

## ✅ Yang Selesai Sprint Ini

- [Fitur/task yang selesai]

## 🚧 Yang Masih Dalam Proses

- [Task yang belum selesai + alasan]

## ❌ Hambatan (Blockers)

- [Masalah yang dihadapi & solusi yang direncanakan]

## 🎯 Target Sprint Berikutnya

- [Rencana minggu depan]

## 📊 Progress

- Fitur MVP (FE) selesai: [X] / 20
- Fitur MVP (BE) selesai: [X] / 20
- Bug open: [N]
```
