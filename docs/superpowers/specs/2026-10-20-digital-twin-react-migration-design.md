# Digital Twin Fasad Kantor — Spesifikasi Teknis Arsitektur

**Tanggal:** 2026-10-20
**Status:** Draft
**Proyek:** Gaussian Splat Digital Twin — Arunika Office
**Branch:** `dev`

---

## 1. Ringkasan

Mengembangkan viewer Gaussian Splatting (fasad kantor Arunika, Blitar) yang sudah berjalan dengan Vite + Vanilla JS menjadi **Digital Twin interaktif** menggunakan arsitektur **Vite + React**. Fokus pada simulasi sensor IoT eksterior, pemantauan energi, integrasi data cuaca real-time, dan sinkronisasi visual lingkungan (skybox, partikel hujan, post-processing).

Aplikasi ini adalah **Single Page App (SPA)** yang berjalan sepenuhnya di sisi klien — tanpa backend, SSR, atau database. Next.js ditolak karena fitur SSR tidak memberi manfaat pada WebGPU canvas dan justru menambah kompleksitas deployment.

---

## 2. Keputusan Arsitektur

### 2.1 Stack Teknologi

| Komponen | Pilihan | Alasan |
|----------|---------|--------|
| Build Tool | Vite (sudah terpasang) | HMR cepat, native ESM, sudah berjalan |
| UI Framework | React 19+ | Reactive state untuk dashboard & modal, ekosistem luas |
| 3D Engine | Three.js r186+ (WebGPU) | Sudah berjalan, mendukung `GaussianSplat` & `CSS2DRenderer` |
| Splat Format | SPZ via `SPZLoader` | Format terkompresi, sudah terintegrasi |
| API Cuaca | OpenWeatherMap (gratis) | Data cuaca Blitar real-time |
| Icons | Lucide React | Ringan, tree-shakeable |

### 2.2 Prinsip Pemisahan

Tiga subsistem yang terisolasi satu sama lain:

1. **`src/three/` — Engine 3D:** Class/modul JavaScript biasa (bukan React component). Tidak bergantung pada React state. Diinisialisasi sekali via `useEffect` dan di-dispose saat unmount.
2. **`src/components/` — Antarmuka UI:** Komponen React deklaratif yang menampilkan data dari services dan mengelola interaksi pengguna (sidebar, modal, floating labels).
3. **`src/services/` — Data Provider:** Modul pure JS yang mengambil data cuaca dan men-generate simulasi IoT, lalu menyalurkannya ke React state via hooks/callbacks.

---

## 3. Struktur Direktori

```text
├── index.html                     # Entry point HTML utama
├── vite.config.mjs                # Vite + @vitejs/plugin-react + alias @
├── package.json
├── model/
│   └── office30000.spz            # Aset Gaussian Splat
├── public/                        # Aset statis (favicon, gambar)
└── src/
    ├── main.jsx                   # ReactDOM.createRoot mount
    ├── App.jsx                    # Root: menyusun Viewport3D + Sidebar + Modal
    ├── App.css                    # Layout global (layering canvas, sidebar, overlay)
    │
    ├── three/                     # Subsistem 3D (Pure JS, tanpa React)
    │   ├── SceneManager.js        # WebGPURenderer, Camera, OrbitControls, resize, animation loop
    │   ├── SplatLoader.js         # SPZLoader + auto-framing bounding sphere
    │   ├── LabelRenderer.js       # CSS2DRenderer setup & anchor management
    │   ├── EnvironmentManager.js  # Skybox/HDRI switching & rain particle system
    │   └── InteractionManager.js  # Raycaster & click-on-3D-object handler
    │
    ├── services/                  # Subsistem Data (Pure JS)
    │   ├── weatherService.js      # Fetch OpenWeatherMap + caching + mock fallback
    │   └── iotSimulationService.js# Interval timer: random watt 1200–7200W setiap 3–5 detik
    │
    ├── components/                # Subsistem UI (React)
    │   ├── canvas/
    │   │   └── Viewport3D.jsx     # Wrapper <div> tempat SceneManager di-mount via useRef/useEffect
    │   ├── dashboard/
    │   │   ├── Sidebar.jsx        # Container sidebar kanan (Panel Atas + Panel Bawah)
    │   │   ├── WeatherCard.jsx    # Suhu, kelembapan, angin, status koneksi API
    │   │   ├── PowerWidget.jsx    # Angka watt real-time + mini chart dummy
    │   │   └── AboutPanel.jsx     # Deskripsi aplikasi & info Arunika Saha Vikasa
    │   ├── labels/
    │   │   ├── PowerFloatingLabel.jsx  # Konten HTML untuk CSS2D di area meteran listrik
    │   │   └── CctvFloatingLabel.jsx   # Konten HTML untuk CSS2D icon CCTV
    │   └── modals/
    │       └── CctvModal.jsx      # Popup modal saat klik icon CCTV (feed / "Maintenance")
    │
    └── constants/
        └── config.js              # Koordinat label 3D, interval update, API endpoint, default camera
```

---

## 4. Alur Data (Data Flow)

```text
weatherService ──(setiap 5-10 menit)──► React App State (hooks)
                                            │
iotSimulationService ──(setiap 3-5 detik)──►│
                                            │
                    ┌───────────────────────┤
                    ▼                       ▼
            Sidebar Components       CSS2DRenderer Labels
            (WeatherCard,            (PowerFloatingLabel,
             PowerWidget,             CctvFloatingLabel)
             AboutPanel)                   │
                                           ▼ (klik icon CCTV)
                                    React State: setCctvModalOpen(true)
                                           │
                                           ▼
                                      CctvModal

React App State ──(cuaca berubah: Rain/Clear)──► EnvironmentManager
                                                  (toggle rain particles,
                                                   switch skybox/tone)
```

### Mekanisme Kunci:

1. **Mount Three.js Sekali:** `SceneManager` diinisialisasi di `useEffect(..., [])` pada `Viewport3D.jsx`. Mengembalikan `dispose()` pada cleanup.
2. **CSS2DRenderer di Layer Terpisah:** Berjalan di atas `<canvas>` WebGPU, pointer-events transparan kecuali pada elemen label interaktif (tombol CCTV).
3. **Update Watt tanpa Re-render Halaman:** Angka watt 3-5 detik di CSS2D Label diperbarui via DOM node langsung (callback dari service), bukan melalui React re-render tree.
4. **Sinkronisasi Visual Cuaca:** `EnvironmentManager` menerima event/callback dari `weatherService` untuk mengaktifkan/menonaktifkan partikel hujan dan menyesuaikan tone pencahayaan scene.

---

## 5. Spesifikasi Komponen

### 5.1 SceneManager.js

- **Tanggung jawab:** Membuat `WebGPURenderer`, `PerspectiveCamera` (FOV 15), `OrbitControls` (damping 0.05, screenSpacePanning), menangani resize window, dan menjalankan animation loop.
- **API Publik:**
  - `constructor(containerElement)` — mount renderer ke elemen DOM
  - `getScene()`, `getCamera()`, `getControls()` — akses objek Three.js
  - `dispose()` — cleanup renderer, event listeners, animation loop

### 5.2 SplatLoader.js

- **Tanggung jawab:** Memuat file `.spz` via `SPZLoader`, menghitung bounding sphere, melakukan auto-framing kamera ke fasad kantor dengan offset dan rotasi yang sudah ditentukan.
- **API Publik:**
  - `load(url, scene, camera, controls, onProgress, onError)` — memuat dan menambahkan splat ke scene
- **Konfigurasi framing:** Offset X/Y/Z dan closeUpFactor dari `config.js`

### 5.3 LabelRenderer.js

- **Tanggung jawab:** Menginisialisasi `CSS2DRenderer` di atas canvas WebGPU, dan menyediakan API untuk menambah/menghapus label pada posisi 3D tertentu.
- **API Publik:**
  - `constructor(containerElement)` — membuat CSS2DRenderer
  - `addLabel(id, htmlElement, position: Vector3)` — menambah label
  - `removeLabel(id)` — menghapus label
  - `update()` — dipanggil dalam animation loop
  - `dispose()` — cleanup

### 5.4 EnvironmentManager.js

- **Tanggung jawab:** Mengelola skybox/HDRI (pagi/siang/malam), sistem partikel hujan (`THREE.Points`), dan post-processing (EffectComposer color correction untuk malam).
- **API Publik:**
  - `setWeatherCondition(condition: string)` — "Clear" / "Clouds" / "Rain"
  - `setTimeOfDay(period: string)` — "morning" / "day" / "night" (berdasarkan jam sistem)
  - `update(deltaTime)` — animasi partikel dalam loop
  - `dispose()` — cleanup

### 5.5 weatherService.js

- **Tanggung jawab:** Fetch data dari OpenWeatherMap API (lokasi: Blitar, -8.0954, 112.1611).
- **Interval:** Setiap 5-10 menit.
- **Data yang dikembalikan:** `{ condition, temperature, humidity, windSpeed, icon, description }`
- **Fallback:** Jika fetch gagal, mengembalikan mock data statis ("Blitar — 29°C Berawan") dan menandai `isOffline: true`.

### 5.6 iotSimulationService.js

- **Tanggung jawab:** Men-generate angka acak dalam rentang 1200W–7200W setiap 3-5 detik (interval random untuk variasi realistis).
- **API:** `start(callback)` — memanggil callback dengan nilai watt baru setiap interval. `stop()` — menghentikan timer.

### 5.7 Viewport3D.jsx

- Mount `SceneManager`, `SplatLoader`, `LabelRenderer` di `useEffect`.
- Menerima callback props untuk event 3D (klik CCTV label).
- Merender satu `<div ref={containerRef}>` sebagai host canvas WebGPU + CSS2D overlay.

### 5.8 Sidebar.jsx

- Layout: panel kanan layar, lebar ~320px, dua bagian vertikal.
- **Panel Atas:** `<WeatherCard />`, `<PowerWidget />` — data ringkasan dengan ikon sederhana.
- **Panel Bawah:** `<AboutPanel />` — deskripsi singkat aplikasi & Arunika Saha Vikasa.
- Styling: glassmorphism (backdrop-blur, semi-transparan) konsisten dengan HUD yang sudah ada.

### 5.9 CctvModal.jsx

- Muncul saat icon CCTV di CSS2D diklik.
- Menampilkan iframe/embed CCTV publik, atau badge "Maintenance" jika feed tidak tersedia.
- Ditutup via tombol close atau klik di luar modal.

---

## 6. Error Handling

| Skenario | Penanganan |
|----------|-----------|
| Browser tidak mendukung WebGPU | Tampilkan error overlay dengan instruksi (sudah ada) |
| File `.spz` gagal dimuat | Error overlay dengan pesan spesifik & tombol Reload |
| OpenWeatherMap API gagal / timeout | Fallback ke mock data, badge "Offline / Simulated" di sidebar |
| API key kuota habis | Sama dengan API gagal — fallback otomatis |
| Memory leak saat navigasi / HMR | `dispose()` pada semua Three.js resources di useEffect cleanup |

---

## 7. Tahapan Implementasi

### Tahap 1: Setup & Scaffolding React
- Menambahkan `react`, `react-dom`, `@vitejs/plugin-react` ke dependencies.
- Memperbarui `vite.config.mjs` (plugin React, alias `@` → `src/`).
- Membuat `src/main.jsx`, `src/App.jsx`, `src/App.css`.
- Memperbarui `index.html` (entry point ke `src/main.jsx`).

### Tahap 2: Modularisasi Engine 3D
- Memindahkan logika dari `public/main.js` ke `src/three/SceneManager.js` dan `src/three/SplatLoader.js`.
- Membuat `Viewport3D.jsx` yang me-mount engine 3D.
- Memastikan model Gaussian Splat berjalan identik dengan kondisi saat ini.

### Tahap 3: CSS2DRenderer & Floating Labels
- Membuat `src/three/LabelRenderer.js`.
- Membuat komponen `PowerFloatingLabel.jsx` dan `CctvFloatingLabel.jsx`.
- Menempatkan label di koordinat fasad (koordinat disesuaikan kemudian).

### Tahap 4: Data Services & Sidebar Dashboard
- Membuat `weatherService.js` (OpenWeatherMap + mock fallback).
- Membuat `iotSimulationService.js` (watt generator).
- Membangun komponen Sidebar: `WeatherCard`, `PowerWidget`, `AboutPanel`.
- Membuat `CctvModal.jsx`.

### Tahap 5: Efek Visual Lingkungan
- Membuat `EnvironmentManager.js`: skybox switching, rain particles (`THREE.Points`), post-processing tone malam.
- Menghubungkan `weatherService` → `EnvironmentManager`.

---

## 8. Batasan & Catatan

- **Baked Lighting:** Gaussian Splat memiliki pencahayaan permanen. Perubahan visual lingkungan dicapai melalui skybox, partikel, dan post-processing (bukan dynamic lighting pada splat).
- **Koordinat CSS2D:** Posisi label meteran listrik dan CCTV di fasad bangunan akan ditentukan kemudian menggunakan raycaster klik yang sudah ada di kode saat ini.
- **Data IoT Simulasi:** Semua data sensor bersifat mock/simulasi karena perangkat keras IoT belum tersedia.
- **CCTV Feed:** Sementara menggunakan link CCTV publik atau badge "Maintenance".
