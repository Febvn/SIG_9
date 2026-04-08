# Praktikum 7: REST API WebGIS dengan FastAPI & PostGIS

Repository ini berisi tugas praktikum ke-7 mata kuliah Sistem Informasi Geografis (SIG). Proyek ini mengimplementasikan REST API menggunakan **FastAPI** untuk mengelola dan melakukan query data spasial pada database **PostGIS**.

## 🚀 Fitur Utama
- **CRUD Operasi**: GET all, GET by ID, dan POST untuk menambah data fasilitas publik.
- **Output GeoJSON**: Endpoint khusus untuk mengembalikan data dalam format standar GeoJSON.
- **Query Spasial (Nearby)**: Mencari fasilitas terdekat berdasarkan titik koordinat dan radius tertentu.
- **Validasi Data**: Menggunakan Pydantic untuk memastikan input koordinat dan data valid.

## 🛠️ Tech Stack
- **Framework**: FastAPI
- **Database**: PostgreSQL with PostGIS extension
- **Driver**: asyncpg (Async Database Driver)
- **Validation**: Pydantic
- **Development Server**: Uvicorn

## 📸 Dokumentasi (Swagger UI)

### 1. Daftar Endpoint API
![Daftar Endpoint](assets/get%20post%20%20create.JPG)

### 2. Eksekusi POST (Menambah Data)
![Eksekusi POST](assets/podt%20falistisa%20esekusi.JPG)
![Eksekusi POST 2](assets/podt%20falistisa%20esekusi%202.JPG)

### 3. Query Spasial (Nearby)
Input parameter Latitude, Longitude, dan Radius:
![Nearby Input](assets/GET%20fasilitas%20nearby.JPG)

Hasil pencarian fasilitas terdekat:
![Nearby Result](assets/GET%20fasilitas%20nearby%20hasil.JPG)

## 📁 Struktur Folder
- `routers/`: Modul routing untuk endpoint fasilitas.
- `database.py`: Konfigurasi koneksi database.
- `models.py`: Skema Pydantic untuk validasi input.
- `main.py`: Entry point aplikasi.
- `.env.example`: Template pengaturan variabel lingkungan.
- `assets/`: Kumpulan screenshot pengujian API.

## ⚙️ Cara Instalasi
1. Clone repository ini.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Salin `.env.example` menjadi `.env` dan sesuaikan `DATABASE_URL` dengan database PostGIS Anda.
4. Jalankan aplikasi:
   ```bash
   uvicorn main:app --reload
   ```

---
**Nama**: Febrian Valentino Nugroho  
**NIM**: 123140034  
**Mata Kuliah**: Praktikum SIG
