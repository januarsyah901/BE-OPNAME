# Panduan Urutan Testing API (Postman Collection)

Dokumen ini menjelaskan alur ketergantungan (dependency flow) dalam melakukan testing API pada project **AutoService Inventory**. Karena sistem ini menggunakan relasi database yang ketat (Prisma/PostgreSQL), urutan pemanggilan endpoint sangat krusial untuk menghindari error *Foreign Key Constraint* atau *404 Not Found*.

## 1. Tahap Persiapan (Autentikasi)
Semua request di bawah ini membutuhkan **Bearer Token**.
- **Login (Admin/Owner/Kasir):** Jalankan request login terlebih dahulu. 
- **Otomasi:** Script pada koleksi Postman akan otomatis menyimpan `token` ke environment variable setelah login berhasil.

## 2. Alur Master Data (Data Induk)
Sebelum melakukan transaksi, data dasar harus dibuat dengan urutan sebagai berikut:

1.  **Categories (Kategori):** 
    - `POST /categories` -> Menghasilkan `{{category_id}}`.
2.  **Spare Parts (Produk):** 
    - `POST /spare-parts` -> Membutuhkan `{{category_id}}`. Menghasilkan `{{spare_part_id}}`.
3.  **Customers (Pelanggan):** 
    - `POST /customers` -> Menghasilkan `{{customer_id}}`.
4.  **Vehicles (Kendaraan):** 
    - `POST /customers/{{customer_id}}/vehicles` -> Membutuhkan `{{customer_id}}`. Menghasilkan `{{vehicle_id}}`.

## 3. Alur Operasional & Transaksi
Setelah data master tersedia, fitur operasional dapat dijalankan:

1.  **Stock Management:** 
    - `POST /stock/in` atau `POST /stock/out` -> Membutuhkan `{{spare_part_id}}`.
2.  **Work Orders (Antrian Servis):** 
    - `POST /work-orders` -> Membutuhkan `{{customer_id}}` & `{{vehicle_id}}`. Menghasilkan `{{work_order_id}}`.
3.  **Transactions (Invoice):** 
    - `POST /transactions` -> Membutuhkan `{{customer_id}}`, `{{vehicle_id}}`, dan list `{{spare_part_id}}`. Menghasilkan `{{transaction_id}}`.

## 4. Alur Penghapusan (Cleanup/Delete)
Jika ingin melakukan testing penghapusan data (misal: Delete Produk ID 1), lakukan dengan urutan **Bottom-Up** (dari yang paling bergantung ke yang paling independen):

1.  **Delete Transaction / Work Order:** Hapus data transaksi/servis terlebih dahulu.
2.  **Delete Vehicle:** Hapus data kendaraan pelanggan.
3.  **Delete Spare Part (Produk):** Baru diperbolehkan menghapus produk (ID 1). 
    - *Catatan: Sistem menggunakan Soft Delete, namun relasi tetap harus diperhatikan.*
4.  **Delete Category / Customer:** Hapus data induk paling akhir.

---

### Tips Testing di Postman:
- Gunakan fitur **Runner** pada Postman (Klik kanan pada folder -> *Run Folder*).
- Pastikan **Environment** (Local/Production) sudah terpilih agar variabel `{{base_url}}` terbaca.
- Jika mendapati error `422 Unprocessable Entity` pada stok, pastikan sudah melakukan `Stock In` sebelum mencoba `Stock Out`.
