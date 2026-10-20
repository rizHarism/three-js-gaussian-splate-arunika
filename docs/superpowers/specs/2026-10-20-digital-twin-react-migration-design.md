# Digital Twin Fasad Kantor — Spesifikasi Teknis Arsitektur

**Tanggal:** 2026-10-20
**Status:** Draft v2
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
| UI Framework | React 18+ | Reactive state untuk dashboard & modal, ekosistem luas |
| 3D Engine | Three.js r186+ (WebGPU) | Sudah berjalan, mendukung `GaussianSplat` & `CSS2DRenderer` |
| Splat Format | SPZ via `SPZLoader` | Format terkompresi, sudah terintegrasi |
| API Cuaca | OpenWeatherMap (gratis) | Data cuaca Blitar real-time |
| Icons | Lucide React | Ringan, tree-shakeable |
| Post-Processing | Node-based `PostProcessing` (WebGPU-compatible) | `EffectComposer` standar **tidak** kompatibel dengan `WebGPURenderer` |

### 2.2 Prinsip Pemisahan

Tiga subsistem yang terisolasi satu sama lain:

1. **`src/three/` — Engine 3D:** Class/modul JavaScript biasa (bukan React component). Tidak bergantung pada React state. Diinisialisasi sekali via `useEffect` dan di-dispose saat unmount.
2. **`src/components/` — Antarmuka UI:** Komponen React deklaratif yang menampilkan data dari services dan mengelola interaksi pengguna (sidebar, modal, floating labels, HUD, loading overlay).
3. **`src/services/` — Data Provider:** Modul pure JS yang mengambil data cuaca dan men-generate simulasi IoT, lalu menyalurkannya ke React state via hooks/callbacks.

### 2.3 State Management

Menggunakan **`useState` di `App.jsx`** sebagai single source of truth, diteruskan ke komponen anak via **props**. Cukup untuk skala aplikasi ini tanpa perlu library state management eksternal.

State yang dikelola di `App.jsx`:

```js
const [weatherData, setWeatherData] = useState(null);      // dari weatherService
const [isWeatherOffline, setIsWeatherOffline] = useState(false);
const [powerWatts, setPowerWatts] = useState(0);            // dari iotSimulationService
const [isCctvModalOpen, setIsCctvModalOpen] = useState(false);
const [isLoading, setIsLoading] = useState(true);           // loading state splat
const [loadingProgress, setLoadingProgress] = useState(0);  // 0-100
const [loadError, setLoadError] = useState(null);           // error message
```

**Bridge React → Three.js (EnvironmentManager):** `Viewport3D.jsx` menerima `weatherData` via props. Di dalam `useEffect` yang mengawasi `[weatherData]`, `Viewport3D` memanggil `environmentManager.setWeatherCondition(weatherData.condition)` secara imperatif. Waktu (pagi/siang/malam) dideteksi dari `new Date().getHours()` di dalam `EnvironmentManager` sendiri.

### 2.4 API Key Handling

- API key OpenWeatherMap disimpan di file `.env` di root project:
  ```
  VITE_OWM_API_KEY=your_api_key_here
  ```
- Diakses via `import.meta.env.VITE_OWM_API_KEY` di `weatherService.js`.
- File `.env` ditambahkan ke `.gitignore`.
- Jika `VITE_OWM_API_KEY` kosong atau undefined, `weatherService` langsung menggunakan mock data fallback dan menandai `isOffline: true` tanpa mencoba fetch.

---

## 3. Struktur Direktori

```text
├── index.html                     # Entry point HTML utama (script src → src/main.jsx)
├── .env                           # VITE_OWM_API_KEY (tidak di-commit)
├── .gitignore                     # Termasuk .env, node_modules, dist
├── vite.config.mjs                # Vite + @vitejs/plugin-react + alias @ → src/
├── package.json
├── public/                        # Aset statis yang di-serve langsung oleh Vite
│   ├── model/
│   │   └── office30000.spz        # Aset Gaussian Splat (dipindah dari root model/)
│   └── favicon.ico                # Favicon (opsional)
└── src/
    ├── main.jsx                   # ReactDOM.createRoot mount
    ├── App.jsx                    # Root: state owner, menyusun Viewport3D + HUD + Sidebar + Modal
    ├── App.css                    # Layout global (layering canvas, sidebar, overlay)
    │
    ├── three/                     # Subsistem 3D (Pure JS, tanpa React)
    │   ├── SceneManager.js        # WebGPURenderer, Camera, OrbitControls, resize, animation loop
    │   ├── SplatLoader.js         # SPZLoader + auto-framing bounding sphere
    │   ├── LabelRenderer.js       # CSS2DRenderer setup & anchor management
    │   └── EnvironmentManager.js  # Skybox/HDRI switching, rain particles, scene tone (WebGPU PostProcessing)
    │
    ├── services/                  # Subsistem Data (Pure JS)
    │   ├── weatherService.js      # Fetch OpenWeatherMap + caching + mock fallback
    │   └── iotSimulationService.js# Interval timer: random watt 1200–7200W setiap 3–5 detik
    │
    ├── components/                # Subsistem UI (React)
    │   ├── canvas/
    │   │   └── Viewport3D.jsx     # Wrapper <div> tempat SceneManager di-mount via useRef/useEffect
    │   ├── hud/
    │   │   ├── TitleBadge.jsx     # Badge judul "Gaussian Splat — WebGPU" (migrasi dari index.html)
    │   │   └── ControlsHint.jsx   # Petunjuk navigasi keyboard/mouse (migrasi dari index.html)
    │   ├── overlays/
    │   │   ├── LoadingOverlay.jsx  # Spinner, progress bar, status text saat memuat splat
    │   │   └── ErrorOverlay.jsx   # Pesan error WebGPU/model + tombol Reload
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
        └── config.js              # Konfigurasi terpusat (lihat §5.11)
```

> **Catatan penting (migrasi model/):** File `office30000.spz` **dipindahkan** dari `model/` di root ke `public/model/`. Vite menyajikan semua file di `public/` sebagai aset statis. Path pemuatan di `SplatLoader.js` menjadi `/model/office30000.spz` (absolute path dari root URL).

> **Catatan alias `@`:** Alias Vite `@` berubah dari `./public` (konfigurasi saat ini) menjadi `./src`. Saat ini tidak ada kode yang menggunakan alias `@`, sehingga perubahan ini tidak berdampak pada kode yang ada.

---

## 4. Alur Data (Data Flow)

```text
weatherService ──(setiap 5 menit)──► App.jsx useState
                                          │
iotSimulationService ──(setiap 3-5 detik)►│
                                          │
                   ┌──────────────────────┤
                   ▼                      ▼
           Sidebar (props)         Viewport3D.jsx (props)
           ├─ WeatherCard               │
           ├─ PowerWidget          useEffect([weatherData])
           └─ AboutPanel                │
                                        ▼ (imperative call)
                                   EnvironmentManager
                                   .setWeatherCondition()

CSS2DRenderer Labels (DOM di dalam Viewport3D container)
├─ PowerFloatingLabel ──► update DOM langsung via callback
└─ CctvFloatingLabel ──► onClick → App.jsx setCctvModalOpen(true)
                                        │
                                        ▼
                                   CctvModal (React Portal)

LoadingOverlay ◄── isLoading, loadingProgress (props dari App.jsx)
ErrorOverlay   ◄── loadError (props dari App.jsx)
TitleBadge     ◄── statis
ControlsHint   ◄── statis
```

### Mekanisme Kunci:

1. **Mount Three.js Sekali:** `SceneManager` diinisialisasi di `useEffect(..., [])` pada `Viewport3D.jsx`. Mengembalikan `dispose()` pada cleanup.
2. **CSS2DRenderer di Layer Terpisah:** Berjalan di atas `<canvas>` WebGPU, pointer-events transparan kecuali pada elemen label interaktif (tombol CCTV).
3. **Update Watt tanpa Re-render Halaman:** Angka watt 3-5 detik di CSS2D Label diperbarui via DOM node langsung (callback dari service), bukan melalui React re-render tree.
4. **Sinkronisasi Visual Cuaca:** `Viewport3D.jsx` memanggil `EnvironmentManager.setWeatherCondition()` secara imperatif di dalam `useEffect` yang mengawasi perubahan `weatherData` props.

---

## 5. Spesifikasi Komponen

### 5.1 SceneManager.js

- **Tanggung jawab:** Membuat `WebGPURenderer`, `PerspectiveCamera` (FOV 15), `OrbitControls` (damping 0.05, screenSpacePanning), menangani resize window, dan menjalankan animation loop.
- **API Publik:**
  - `constructor(containerElement)` — mount renderer ke elemen DOM
  - `getScene()`, `getCamera()`, `getControls()`, `getRenderer()` — akses objek Three.js
  - `dispose()` — cleanup renderer, event listeners, animation loop
- **Performa:** Mempertahankan `setPixelRatio(Math.min(devicePixelRatio, 2))` dari kode saat ini.

### 5.2 SplatLoader.js

- **Tanggung jawab:** Memuat file `.spz` via `SPZLoader`, menghitung bounding sphere, melakukan auto-framing kamera ke fasad kantor dengan offset dan rotasi yang sudah ditentukan.
- **API Publik:**
  - `load(url, scene, camera, controls, { onProgress, onLoad, onError })` — memuat dan menambahkan splat ke scene
- **Path model:** `/model/office30000.spz` (dari `public/model/`)
- **Konfigurasi framing:** Offset X/Y/Z dan closeUpFactor dari `config.js`

### 5.3 LabelRenderer.js

- **Tanggung jawab:** Menginisialisasi `CSS2DRenderer` di atas canvas WebGPU, dan menyediakan API untuk menambah/menghapus label pada posisi 3D tertentu.
- **API Publik:**
  - `constructor(containerElement)` — membuat CSS2DRenderer
  - `addLabel(id, htmlElement, position: Vector3)` — menambah label
  - `removeLabel(id)` — menghapus label
  - `update(camera)` — dipanggil dalam animation loop
  - `dispose()` — cleanup
- **Catatan:** Interaksi klik pada label CCTV ditangani melalui event listener DOM biasa pada elemen HTML label itu sendiri (CSS2D objects adalah elemen DOM, bukan mesh 3D). Tidak memerlukan raycasting Three.js.

### 5.4 EnvironmentManager.js

- **Tanggung jawab:** Mengelola skybox/HDRI (pagi/siang/malam), sistem partikel hujan (`THREE.Points`), dan tone pencahayaan scene.
- **Post-processing:** Menggunakan **node-based `PostProcessing`** class dari `three/addons/postprocessing/PostProcessing.js` yang kompatibel dengan `WebGPURenderer` — **bukan** `EffectComposer` standar yang hanya mendukung WebGL.
- **API Publik:**
  - `constructor(scene, renderer)` — setup awal
  - `setWeatherCondition(condition: string)` — "Clear" / "Clouds" / "Rain"
  - `setTimeOfDay(period: string)` — "morning" / "day" / "night" (dipanggil berdasarkan `new Date().getHours()`)
  - `update(deltaTime)` — animasi partikel dalam loop
  - `dispose()` — cleanup
- **Dipanggil oleh:** `Viewport3D.jsx` di dalam `useEffect([weatherData])` untuk cuaca. Waktu dievaluasi secara internal setiap kali `update()` dipanggil.
- **Performa:** Jumlah partikel hujan dibatasi maksimal 5000 particles.

### 5.5 weatherService.js

- **Tanggung jawab:** Fetch data dari OpenWeatherMap API (lokasi: Blitar, -8.0954, 112.1611).
- **Interval:** Setiap **5 menit** (`WEATHER_POLL_INTERVAL_MS = 5 * 60 * 1000`).
- **API Key:** Dibaca dari `import.meta.env.VITE_OWM_API_KEY`. Jika kosong, langsung fallback ke mock tanpa fetch.
- **Data yang dikembalikan:** `{ condition, temperature, humidity, windSpeed, icon, description, isOffline }`
- **Fallback:** Jika fetch gagal atau API key tidak ada, mengembalikan mock data statis ("Blitar — 29°C Berawan") dan menandai `isOffline: true`.
- **API Publik:** `startPolling(callback)` — mulai fetch berkala. `stopPolling()` — hentikan. `fetchOnce()` — fetch satu kali.

### 5.6 iotSimulationService.js

- **Tanggung jawab:** Men-generate angka acak dalam rentang 1200W–7200W setiap 3-5 detik (interval random antara `IOT_MIN_INTERVAL_MS = 3000` dan `IOT_MAX_INTERVAL_MS = 5000` untuk variasi realistis).
- **API Publik:** `start(callback)` — memanggil callback dengan nilai watt baru setiap interval. `stop()` — menghentikan timer.

### 5.7 Viewport3D.jsx

- Mount `SceneManager`, `SplatLoader`, `LabelRenderer`, `EnvironmentManager` di `useEffect(..., [])`.
- Menerima props: `weatherData`, `powerWatts`, `onCctvClick`, `onLoadProgress`, `onLoadComplete`, `onLoadError`.
- `useEffect([weatherData])` — memanggil `environmentManager.setWeatherCondition()` secara imperatif.
- Merender satu `<div ref={containerRef}>` sebagai host canvas WebGPU + CSS2D overlay.

### 5.8 HUD Components

- **TitleBadge.jsx:** Migrasi dari `#title-badge` di `index.html`. Menampilkan "Gaussian Splat — WebGPU" dan "Arunika Office". Komponen statis.
- **ControlsHint.jsx:** Migrasi dari `#controls-hint` di `index.html`. Menampilkan petunjuk navigasi (Left Click Rotate, Right Click Pan, Scroll Zoom). Komponen statis.

### 5.9 Overlay Components

- **LoadingOverlay.jsx:** Migrasi dari `#loading-overlay` di `index.html`. Menerima props `isLoading`, `progress` (0-100), `statusText`. Menampilkan spinner, progress bar, dan status teks. Fade-out saat `isLoading` menjadi `false`.
- **ErrorOverlay.jsx:** Migrasi dari `#error-overlay` di `index.html`. Menerima props `error` (string | null). Menampilkan ikon ⚠️, pesan error, dan tombol Reload. Ditampilkan hanya ketika `error` tidak null.

### 5.10 Sidebar.jsx & Dashboard Components

- Layout: panel kanan layar, lebar ~320px, dua bagian vertikal.
- **Panel Atas:** `<WeatherCard />`, `<PowerWidget />` — data ringkasan dengan ikon sederhana.
- **Panel Bawah:** `<AboutPanel />` — deskripsi singkat aplikasi & Arunika Saha Vikasa.
- Styling: glassmorphism (backdrop-blur, semi-transparan) konsisten dengan HUD yang sudah ada.

### 5.11 CctvModal.jsx

- Muncul saat icon CCTV di CSS2D diklik.
- Menampilkan iframe/embed CCTV publik, atau badge "Maintenance" jika feed tidak tersedia.
- Ditutup via tombol close, klik di luar modal, atau tombol Escape.

### 5.12 config.js

Konfigurasi terpusat yang diekspor:

```js
export const CONFIG = {
  // Model
  MODEL_PATH: '/model/office30000.spz',

  // Camera Defaults
  CAMERA_FOV: 15,
  CAMERA_NEAR: 0.01,
  CAMERA_POSITION: { x: 10, y: 10, z: 10 },

  // Framing Offset (saat splat dimuat)
  FRAMING_OFFSET: { x: 10.0, y: 6, z: 1.0 },
  FRAMING_CLOSE_UP_FACTOR: 0.8,
  FRAMING_ROTATION_ANGLE: Math.PI / 18,

  // Weather Service
  OWM_BASE_URL: 'https://api.openweathermap.org/data/2.5/weather',
  OWM_LOCATION: { lat: -8.0954, lon: 112.1611 },
  WEATHER_POLL_INTERVAL_MS: 5 * 60 * 1000, // 5 menit

  // IoT Simulation
  IOT_MIN_WATTS: 1200,
  IOT_MAX_WATTS: 7200,
  IOT_MIN_INTERVAL_MS: 3000,
  IOT_MAX_INTERVAL_MS: 5000,

  // CSS2D Label Coordinates (disesuaikan kemudian via raycaster debug)
  LABEL_POWER_METER: { x: 0, y: 0, z: 0 },    // placeholder
  LABEL_CCTV_RIGHT:  { x: 0, y: 0, z: 0 },     // sisi kanan depan
  LABEL_CCTV_LEFT:   { x: 0, y: 0, z: 0 },      // sisi kiri

  // Environment
  MAX_RAIN_PARTICLES: 5000,
};
```

---

## 6. Error Handling

| Skenario | Penanganan |
|----------|-----------|
| Browser tidak mendukung WebGPU | `ErrorOverlay` dengan instruksi (migrasi overlay yang sudah ada) |
| File `.spz` gagal dimuat | `ErrorOverlay` dengan pesan spesifik & tombol Reload |
| OpenWeatherMap API gagal / timeout | Fallback ke mock data, badge "Offline / Simulated" di `WeatherCard` |
| API key tidak dikonfigurasi | Langsung gunakan mock data, badge "Offline" |
| API key kuota habis | Sama dengan API gagal — fallback otomatis |
| Memory leak saat navigasi / HMR | `dispose()` pada semua Three.js resources di useEffect cleanup |

---

## 7. Tahapan Implementasi

### Tahap 1: Setup & Scaffolding React
- Menambahkan `react`, `react-dom`, `@vitejs/plugin-react`, `lucide-react` ke dependencies.
- Memperbarui `vite.config.mjs` (plugin React, alias `@` → `./src`). **Breaking change:** alias `@` berubah dari `./public` ke `./src` (tidak ada kode existing yang menggunakan alias ini).
- Memindahkan `model/office30000.spz` dari `model/` ke `public/model/`.
- Membuat `src/main.jsx`, `src/App.jsx`, `src/App.css`, `src/constants/config.js`.
- Memperbarui `index.html` (entry point ke `src/main.jsx`, menghapus inline HUD/overlay HTML yang akan menjadi React components).
- Menambahkan `.env` ke `.gitignore`.

### Tahap 2: Modularisasi Engine 3D & Migrasi UI Existing
- Memindahkan logika dari `public/main.js` ke `src/three/SceneManager.js` dan `src/three/SplatLoader.js`.
- Membuat `Viewport3D.jsx` yang me-mount engine 3D.
- Migrasi HUD (`TitleBadge.jsx`, `ControlsHint.jsx`) dan overlay (`LoadingOverlay.jsx`, `ErrorOverlay.jsx`) dari inline HTML ke React components.
- **Checkpoint:** Memastikan model Gaussian Splat berjalan identik dengan kondisi saat ini — loading overlay, error handling, kamera framing, orbit controls semua berfungsi.

### Tahap 3: CSS2DRenderer & Floating Labels
- Membuat `src/three/LabelRenderer.js`.
- Membuat komponen `PowerFloatingLabel.jsx` dan `CctvFloatingLabel.jsx`.
- Menempatkan label di koordinat fasad (koordinat disesuaikan kemudian via raycaster debugging yang sudah ada).

### Tahap 4: Data Services & Sidebar Dashboard
- Membuat `.env` dengan `VITE_OWM_API_KEY`.
- Membuat `weatherService.js` (OpenWeatherMap + mock fallback).
- Membuat `iotSimulationService.js` (watt generator).
- Membangun komponen Sidebar: `WeatherCard`, `PowerWidget`, `AboutPanel`.
- Membuat `CctvModal.jsx`.

### Tahap 5: Efek Visual Lingkungan
- Membuat `EnvironmentManager.js`: skybox switching, rain particles (`THREE.Points`, max 5000), tone malam via WebGPU-compatible `PostProcessing` class.
- Menghubungkan `weatherService` → `Viewport3D` (via props) → `EnvironmentManager` (via imperative call).

---

## 8. Deployment & Build

- **Build command:** `npx vite build` — output ke `dist/`.
- **Target deployment:** Static hosting (Netlify, Vercel static, GitHub Pages, atau web server statis internal).
- **Tidak memerlukan server backend** — seluruh logika berjalan di browser.

---

## 9. Testing

- **Pengujian manual** untuk fase awal proyek riset ini:
  - Checklist: WebGPU rendering, loading overlay & progress, error overlay, orbit controls, CSS2D label positioning, weather data fetch & fallback, IoT simulation update, CCTV modal open/close, rain particles, skybox switching.
- **Browser compatibility:** Chrome 113+ (WebGPU default), Edge 113+ (WebGPU default). Firefox WebGPU masih eksperimental.
- **Automated testing:** Di luar cakupan fase saat ini. Dapat ditambahkan kemudian jika proyek berkembang.

---

## 10. Performa

- **Model:** `office30000.spz` (~30.000 splats) — ringan untuk GPU modern.
- **Target FPS:** 60 FPS pada GPU mid-range.
- **Pixel ratio:** Dibatasi `Math.min(devicePixelRatio, 2)` untuk mencegah beban berlebih pada layar HiDPI.
- **Rain particles:** Maksimal 5000 partikel aktif.
- **Weather polling:** 5 menit interval — tidak membebani API atau network.
- **IoT simulation:** Timer interval ringan, tidak berdampak pada performa render.

---

## 11. Batasan & Catatan

- **Baked Lighting:** Gaussian Splat memiliki pencahayaan permanen. Perubahan visual lingkungan dicapai melalui skybox, partikel, dan post-processing (bukan dynamic lighting pada splat).
- **Koordinat CSS2D:** Posisi label meteran listrik dan CCTV di fasad bangunan akan ditentukan kemudian menggunakan raycaster klik yang sudah ada di kode saat ini. Klik pada Gaussian Splat tidak menghasilkan raycast hit standar — koordinat label ditetapkan secara manual di `config.js`.
- **Data IoT Simulasi:** Semua data sensor bersifat mock/simulasi karena perangkat keras IoT belum tersedia.
- **CCTV Feed:** Sementara menggunakan link CCTV publik atau badge "Maintenance".
- **Responsive / Mobile:** Sidebar disembunyikan atau di-collapse pada layar kecil (<768px). Detail implementasi responsive disesuaikan kemudian.
- **Kode lama:** `public/main.js` dipertahankan di branch `dev` sebagai referensi selama migrasi. Dihapus setelah Tahap 2 selesai dan terverifikasi.
