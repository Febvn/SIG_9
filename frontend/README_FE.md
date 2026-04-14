# WebGIS Frontend - Pertemuan 8 (React & Leaflet)

Proyek ini adalah implementasi sistem informasi geografis berbasis web (WebGIS) yang dibangun menggunakan **React.js** dan **Leaflet**. Frontend ini terintegrasi secara penuh dengan Backend **FastAPI** dan database **PostGIS**.

## 📸 Dokumentasi Antarmuka

````carousel
![Main Interface](file:///c:/Users/muham/OneDrive/Pictures/SIG_7/assets/main.JPG)
<!-- slide -->
![Sidebar & Widgets](file:///c:/Users/muham/OneDrive/Pictures/SIG_7/assets/side%20bar.JPG)
<!-- slide -->
![Markers & Categories](file:///c:/Users/muham/OneDrive/Pictures/SIG_7/assets/marker.JPG)
<!-- slide -->
![Nearby Search Interaction](file:///c:/Users/muham/OneDrive/Pictures/SIG_7/assets/lingkaran.JPG)
<!-- slide -->
![Create Facility Form](file:///c:/Users/muham/OneDrive/Pictures/SIG_7/assets/Fasilitas%20create.JPG)
````

## 🚀 Fitur Utama

-   **Visualisasi GeoJSON Dinamis:** Merender data spasial dari API secara real-time dengan kategori simbol kustom.
-   **Pencarian Spasial (Nearby):** Fitur pencarian radius menggunakan query spasial `ST_DWithin` dari PostGIS.
-   **Manajemen Data (Create):** Menambahkan data fasilitas publik baru langsung melalui klik koordinat pada peta.
-   **Apple-Style Neumorphism UI:** Antarmuka modern dengan efek *Frosted Glass* (Glassmorphism) dan *Soft UI* (Neumorphism).
-   **Interaksi Lanjutan:** 
    *   **Pulse Animation:** Efek mengembang pada marker saat kategori dipilih.
    *   **Auto-Fly Navigation:** Animasi perpindahan kamera peta yang halus.
    *   **Basemap Switcher:** Pilihan layer peta (Dark, Street, Satellite).
-   **Real-time Statistics:** Dashboard widget yang menghitung jumlah total fasilitas per kategori secara dinamis.

## 🛠️ Tech Stack

-   **Framework:** [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/)
-   **Mapping:** [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
-   **Icons:** [Lucide-React](https://lucide.dev/)
-   **Styling:** Vanilla CSS (Modern CSS Variables & Shadows)
-   **HTTP Client:** Axios

## 📦 Struktur Folder

```text
frontend/
├── src/
│   ├── App.jsx           # Komponen utama & logika peta
│   ├── constants.js      # Konfigurasi API & Kategori
│   ├── index.css         # Desain Neumorphism & Global Styles
│   └── main.jsx          # Entry point aplikasi
├── index.html
└── package.json
```

## ⚙️ Instalasi & Running

1.  **Masuk ke folder frontend:**
    ```bash
    cd frontend
    ```

2.  **Install dependensi:**
    ```bash
    npm install
    ```

3.  **Pastikan Backend FastAPI sudah berjalan** di `http://localhost:8000`. Jika URL berbeda, sesuaikan di `src/constants.js`.

4.  **Jalankan aplikasi:**
    ```bash
    npm run dev
    ```

5.  **Buka di browser:**
    Aplikasi akan berjalan di `http://localhost:5173`.

---
**Praktikum SIG - Pertemuan 8**  
Febrian Valentino Nugroho (123140034)
