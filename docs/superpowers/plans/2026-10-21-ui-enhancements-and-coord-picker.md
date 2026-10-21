# Peningkatan UI, CCTV Drawer, & Coordinate Picker — Rencana Implementasi

> **Panduan Eksekusi:** Gunakan format checkbox (`- [ ]`) untuk melacak setiap tahapan. Setiap task berisi instruksi langkah demi langkah, kode perubahan yang presisi, dan verifikasi otomatis.

**Tujuan:** Mengimplementasikan 6 peningkatan pada Digital Twin Arunika Fasad Kantor sesuai spesifikasi desain di `docs/superpowers/specs/2026-10-21-ui-enhancements-and-coord-picker-design.md`:
1. Area partikel hujan diperluas ($160 \times 160$ unit, 10.000 partikel).
2. Raycaster Console Coordinate Picker pada kanvas dengan filter anti-drag dan filter partikel hujan.
3. Jam digital real-time sinkron jam mesin lokal pada kartu cuaca.
4. Tinggi sidebar dinamis mengikuti teks deskripsi.
5. Panel laci CCTV non-blocking geser (*slide-out*) di sisi kiri bawah Title Badge dengan simulasi video loop dan panduan integrasi stream asli.
6. Loading screen futuristik memadukan identitas brand Arunika, dual rotating cyber rings, dan stepper WebGPU.

**Tech Stack:** React 19, Three.js WebGPU (r186), Lucide React, Vite, CSS Modules / Glassmorphism.

---

## Task 1: Environment & Config Updates (Perluasan Area Hujan)

**Files yang Terlibat:**
- Modify: `src/constants/config.js`
- Modify: `src/three/EnvironmentManager.js`

- [ ] **Step 1: Update konfigurasi partikel hujan di `src/constants/config.js`**

Ubah `MAX_RAIN_PARTICLES` dari `5000` menjadi `10000`, dan tambahkan konstanta `RAIN_BOUNDS`:
```javascript
  // Environment & Visuals
  MAX_RAIN_PARTICLES: 10000,
  RAIN_BOUNDS: {
    widthX: 160,
    widthZ: 160,
    centerX: 10,
    centerZ: 1,
    minY: -5,
    maxY: 50,
  },
```

- [ ] **Step 2: Update sebaran partikel dan reset batas di `src/three/EnvironmentManager.js`**

Perbarui metode `_initRainParticles()` dan `update()` agar partikel tersebar luas di area $160 \times 160$ dengan pusat $(+10, +1)$ dan jatuh dari $Y = 50$ hingga $Y = -5$:
```javascript
  _initRainParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);
    const bounds = CONFIG.RAIN_BOUNDS || {
      widthX: 160,
      widthZ: 160,
      centerX: 10,
      centerZ: 1,
      minY: -5,
      maxY: 50,
    };

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * bounds.widthX + bounds.centerX;
      positions[i * 3 + 1] = Math.random() * (bounds.maxY - bounds.minY) + bounds.minY;
      positions[i * 3 + 2] = (Math.random() - 0.5) * bounds.widthZ + bounds.centerZ;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    });

    this.rainParticles = new THREE.Points(geometry, material);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  update(delta) {
    if (!this.isRaining || !this.rainParticles) return;

    const positions = this.rainParticles.geometry.attributes.position.array;
    const minY = CONFIG.RAIN_BOUNDS?.minY ?? -5;
    const maxY = CONFIG.RAIN_BOUNDS?.maxY ?? 50;

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3 + 1] -= 28 * delta;
      if (positions[i * 3 + 1] < minY) {
        positions[i * 3 + 1] = maxY;
      }
    }
    this.rainParticles.geometry.attributes.position.needsUpdate = true;
  }
```

- [ ] **Step 3: Verifikasi sintaks EnvironmentManager**
Jalankan evaluasi Node untuk memastikan tidak ada kesalahan impor atau sintaks:
```powershell
node -e "import('./src/constants/config.js'); import('./src/three/EnvironmentManager.js'); console.log('Task 1 syntax valid');"
```

---

## Task 2: Raycaster Console Coordinate Picker

**Files yang Terlibat:**
- Modify: `src/components/canvas/Viewport3D.jsx`

- [ ] **Step 1: Pasang event listener pointer di canvas container pada `src/components/canvas/Viewport3D.jsx`**

Tambahkan referensi `pointerDownPos` untuk merekam titik awal klik, periksa toleransi drag $< 5\text{ px}$, dan tembakkan `Raycaster` Three.js dengan filter partikel hujan:
```javascript
  // Di dalam useEffect Viewport3D:
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let pointerStart = { x: 0, y: 0 };

  const handlePointerDown = (e) => {
    pointerStart = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    const deltaX = e.clientX - pointerStart.x;
    const deltaY = e.clientY - pointerStart.y;
    const distance = Math.hypot(deltaX, deltaY);

    // Abaikan jika pointer bergeser lebih dari 5px (pengguna sedang drag/orbit)
    if (distance >= 5) return;

    const container = containerRef.current;
    if (!container || !sceneManagerRef.current) return;

    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const camera = sceneManagerRef.current.getCamera();
    const scene = sceneManagerRef.current.getScene();
    if (!camera || !scene) return;

    raycaster.setFromCamera(mouse, camera);
    const rawHits = raycaster.intersectObjects(scene.children, true);

    // Filter partikel hujan (THREE.Points) agar berkas raycast tidak terhalang titik air di udara
    const hits = rawHits.filter(
      (hit) => !hit.object.isPoints && hit.object.type !== "Points"
    );

    if (hits.length > 0) {
      const pt = hits[0].point;
      console.log(
        `%c📍 Picked 3D Coordinate: { x: ${pt.x.toFixed(2)}, y: ${pt.y.toFixed(2)}, z: ${pt.z.toFixed(2)} }`,
        "background: #0284c7; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-family: monospace;"
      );
      console.log("Vector3 object:", pt);
    } else {
      console.log("%cClicked into empty space (no surface hit).", "color: #94a3b8; font-style: italic;");
    }
  };

  const containerEl = containerRef.current;
  containerEl.addEventListener("pointerdown", handlePointerDown);
  containerEl.addEventListener("pointerup", handlePointerUp);

  // Jangan lupa cleanup di return () => { ... }
  // containerEl.removeEventListener("pointerdown", handlePointerDown);
  // containerEl.removeEventListener("pointerup", handlePointerUp);
```

- [ ] **Step 2: Update pemanggilan `onCctvClick` agar menyalurkan nama kamera**
Di dalam callback `splatLoader.load` bagian `onLoad`:
```javascript
  const cctvRightEl = createCctvFloatingLabelElement("CCTV Depan", () => onCctvClick?.("CCTV Depan (Kanan)"));
  const cctvLeftEl = createCctvFloatingLabelElement("CCTV Kiri", () => onCctvClick?.("CCTV Area Kiri"));
```

---

## Task 3: Real-Time Digital Clock & Dynamic Sidebar Height

**Files yang Terlibat:**
- Modify: `src/components/dashboard/WeatherCard.jsx`
- Modify: `src/App.css`

- [ ] **Step 1: Tambahkan jam digital real-time di `src/components/dashboard/WeatherCard.jsx`**

Impor ikon `Clock` dari `lucide-react`, pasang interval 1 detik, dan tampilkan waktu format `HH:mm:ss WIB`:
```jsx
import React, { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets, WifiOff, Clock } from "lucide-react";

export default function WeatherCard({ weatherData }) {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Tampilkan di header sejajar dengan info lokasi:
  // <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#38bdf8", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
  //   <Clock size={12} /> {formattedTime} WIB
  // </span>
```

- [ ] **Step 2: Sesuaikan CSS sidebar di `src/App.css` agar tingginya dinamis**
```css
/* Sidebar Dashboard */
.sidebar-container {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 320px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 20;
  pointer-events: auto;
}

.sidebar-panel-bottom {
  overflow: hidden;
}
```

---

## Task 4: Non-Blocking Left CCTV Drawer & State Wiring

**Files yang Terlibat:**
- Create: `src/components/dashboard/CctvDrawer.jsx`
- Delete: `src/components/modals/CctvModal.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.css`

- [ ] **Step 1: Buat komponen `src/components/dashboard/CctvDrawer.jsx`**

Panel laci geser di sisi kiri di bawah Title Badge (`top: 85px`), non-blocking, dengan simulasi video feed dan blok komentar panduan stream asli:
```jsx
import React, { useEffect, useState } from "react";
import { X, Video, ShieldCheck, RefreshCw } from "lucide-react";

export default function CctvDrawer({ isOpen, onClose, cctvName = "Front Office CCTV" }) {
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString().replace("T", " ").substring(0, 19));

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimestamp(new Date().toISOString().replace("T", " ").substring(0, 19));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <aside className={`cctv-drawer-panel ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
      <div className="cctv-drawer-header">
        <div className="cctv-drawer-title">
          <span className="cctv-live-dot" />
          <span>{cctvName}</span>
        </div>
        <button className="cctv-close-btn" onClick={onClose} title="Tutup Panel CCTV (Esc)">
          <X size={16} />
        </button>
      </div>

      <div className="cctv-screen-viewport">
        {/*
          ======================================================================
          PANDUAN INTEGRASI STREAM CCTV ASLI:
          - Untuk stream HLS (.m3u8): Gunakan library 'hls.js' lalu sematkan ke elemen <video ref={videoRef}>.
          - Untuk RTSP / WebRTC: Gunakan WebRTC signaling gateway (seperti go2rtc atau mediamtx).
          - Untuk file MP4 / WebM simulasi online: Masukkan URL ke properti src tag <video>.
          ======================================================================
        */}
        <div className="cctv-simulated-screen">
          <div className="cctv-overlay-scanline" />
          <div className="cctv-osd-top">
            <span className="cctv-badge-live">● LIVE (MOCK)</span>
            <span>{timestamp}</span>
          </div>
          <div className="cctv-center-crosshair">
            <div className="crosshair-target" />
            <span className="cctv-channel-name">CH-01: FACADE_CAM</span>
          </div>
          <div className="cctv-osd-bottom">
            <span>RES: 1920x1080 @ 30FPS</span>
            <span>SIG: 98% (STABLE)</span>
          </div>
        </div>
      </div>

      <div className="cctv-drawer-footer">
        <div className="cctv-status-info">
          <ShieldCheck size={14} color="#22c55e" />
          <span>Kamera Keamanan Eksterior Berfungsi Normal</span>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Tambahkan styling CCTV Drawer ke `src/App.css` dan hapus styling modal lama**
```css
/* CCTV Drawer (Non-blocking Left Panel) */
.cctv-drawer-panel {
  position: fixed;
  top: 85px;
  left: 20px;
  width: 340px;
  max-width: calc(100vw - 40px);
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  z-index: 25;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateX(-120%);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}

.cctv-drawer-panel.open {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.cctv-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.cctv-drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
}

.cctv-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: pulseDot 1.5s infinite;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.cctv-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background-color 0.15s;
}

.cctv-close-btn:hover {
  color: #f8fafc;
  background-color: rgba(255, 255, 255, 0.08);
}

.cctv-screen-viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #030712;
  overflow: hidden;
}

.cctv-simulated-screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px 12px;
  background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);
  font-family: monospace;
  font-size: 10px;
  color: #94a3b8;
}

.cctv-overlay-scanline {
  position: absolute;
  inset: 0;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.35) 50%),
              linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
  background-size: 100% 3px, 4px 100%;
  pointer-events: none;
}

.cctv-osd-top, .cctv-osd-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 2;
}

.cctv-badge-live {
  color: #ef4444;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.cctv-center-crosshair {
  align-self: center;
  text-align: center;
  z-index: 2;
  opacity: 0.7;
}

.crosshair-target {
  width: 32px;
  height: 32px;
  border: 1px dashed rgba(56, 189, 248, 0.5);
  border-radius: 50%;
  margin: 0 auto 4px auto;
}

.cctv-channel-name {
  color: #38bdf8;
  font-size: 10px;
  letter-spacing: 0.05em;
}

.cctv-drawer-footer {
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.cctv-status-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #cbd5e1;
}
```

- [ ] **Step 3: Update `src/App.jsx` untuk memakai `CctvDrawer` dan hapus `CctvModal`**
Perbarui `src/App.jsx`:
- Ganti import `CctvModal` dengan `CctvDrawer`.
- Tambahkan state `activeCctvName` (`useState("Front Office CCTV")`).
- `handleCctvClick = (name) => { setActiveCctvName(name || "Front Office CCTV"); setIsCctvModalOpen(true); }`.
- Hapus file `src/components/modals/CctvModal.jsx`.

---

## Task 5: Futuristic & Brand Hybrid Loading Screen

**Files yang Terlibat:**
- Modify: `src/components/overlays/LoadingOverlay.jsx`
- Modify: `src/App.css`

- [ ] **Step 1: Desain ulang `src/components/overlays/LoadingOverlay.jsx`**

Sematkan dual concentric cyber gyro rings, logo Arunika pulse aura, persentase besar bercahaya, 3-stage WebGPU pipeline stepper, dan shimmer bar:
```jsx
import React from "react";

export default function LoadingOverlay({ isLoading, progress, statusText }) {
  if (!isLoading) return null;

  return (
    <div id="loading-overlay">
      <div className="loading-card futuristic-loader">
        {/* Ambient Glow */}
        <div className="loader-ambient-glow" />

        {/* Dual Rotating Cyber Gyro Rings */}
        <div className="cyber-gyro-container">
          <div className="gyro-ring ring-outer" />
          <div className="gyro-ring ring-inner" />
          <div className="gyro-core-brand">
            <span className="brand-logo-symbol">❖</span>
          </div>
        </div>

        {/* Title & Brand */}
        <div className="loading-title">Arunika Office</div>
        <div className="loading-subtitle">Digital Twin Fasad — Three.js WebGPU</div>

        {/* Percentage Display */}
        <div className="loading-percent-display">
          <span className="percent-num">{progress}</span>
          <span className="percent-unit">%</span>
        </div>

        {/* Shimmer Progress Track */}
        <div className="progress-track shimmer-track">
          <div id="progress-bar" style={{ width: `${progress}%` }}>
            <div className="progress-shimmer-wave" />
          </div>
        </div>

        {/* Current Operation Text */}
        <div id="status-text">{statusText}</div>

        {/* 3-Stage Pipeline Stepper */}
        <div className="loading-pipeline-steps">
          <div className={`step-item ${progress >= 10 ? "active" : ""}`}>
            <span className="step-dot" /> WebGPU Engine
          </div>
          <div className={`step-item ${progress >= 40 ? "active" : ""}`}>
            <span className="step-dot" /> SPZ Geometry
          </div>
          <div className={`step-item ${progress >= 95 ? "active" : ""}`}>
            <span className="step-dot" /> Scene Ready
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Tambahkan styling loader & keyframes ke `src/App.css`**
```css
/* Futuristic Cyber Loader */
.futuristic-loader {
  position: relative;
  overflow: hidden;
  max-width: 440px;
  background: rgba(13, 17, 28, 0.92);
  border: 1px solid rgba(56, 189, 248, 0.2);
  box-shadow: 0 0 50px rgba(56, 189, 248, 0.15), 0 20px 40px rgba(0, 0, 0, 0.7);
}

.loader-ambient-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 60%);
  pointer-events: none;
}

.cyber-gyro-container {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0 auto 16px auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gyro-ring {
  position: absolute;
  border-radius: 50%;
}

.ring-outer {
  inset: 0;
  border: 2px dashed rgba(56, 189, 248, 0.6);
  animation: gyroSpinClockwise 8s linear infinite;
}

.ring-inner {
  inset: 10px;
  border: 2px solid transparent;
  border-top-color: #818cf8;
  border-bottom-color: #38bdf8;
  animation: gyroSpinCounter 3s linear infinite;
}

.gyro-core-brand {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo-symbol {
  font-size: 20px;
  color: #38bdf8;
  animation: brandPulse 2s ease-in-out infinite;
}

@keyframes gyroSpinClockwise {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes gyroSpinCounter {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

@keyframes brandPulse {
  0%, 100% { transform: scale(1); opacity: 0.8; text-shadow: 0 0 10px rgba(56, 189, 248, 0.5); }
  50% { transform: scale(1.15); opacity: 1; text-shadow: 0 0 18px rgba(56, 189, 248, 0.9); }
}

.loading-percent-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  margin: 10px 0 12px 0;
}

.percent-num {
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.percent-unit {
  font-size: 14px;
  font-weight: 700;
  color: #818cf8;
}

.shimmer-track {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  height: 8px;
}

.progress-shimmer-wave {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  animation: shimmerMove 1.5s infinite;
}

@keyframes shimmerMove {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.loading-pipeline-steps {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 5px;
  transition: color 0.3s ease;
}

.step-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #475569;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.step-item.active {
  color: #94a3b8;
}

.step-item.active .step-dot {
  background: #38bdf8;
  box-shadow: 0 0 6px #38bdf8;
}
```

---

## Task 6: Build Verification, Manual Testing & Git Commit

- [ ] **Step 1: Jalankan automated build verification**
```powershell
Set-Location "D:\00. ARUNIKA\01. PROJECT INTERNAL\01. RESEARCH\THEREE JS\Gausial Arunika"
npx vite build
```
Pastikan output `0 errors` dan berkas `dist/` terbentuk sukses.

- [ ] **Step 2: Pengujian manual visual via dev server**
Jalankan `npx vite dev` dan uji 6 butir di browser:
1. Partikel hujan menjangkau seluruh area gedung dan halaman.
2. Buka Console (`F12`), klik dinding -> muncul log koordinat presisi. Putar kamera -> console tidak spam.
3. Jam digital di kartu cuaca berdetak sinkron waktu lokal.
4. Tinggi sidebar dinamis tanpa area kosong menjulur ke bawah.
5. Klik badge CCTV -> drawer meluncur dari kiri bawah Title Badge. Scene 3D di tengah tetap bisa diputar bebas tanpa terhalang backdrop.
6. Refresh halaman -> amati loading screen futuristik cyber rings + brand Arunika.

- [ ] **Step 3: Commit semua perubahan ke Git**
```powershell
git add .
git commit -m "feat(ui): complete rain expansion, coordinate picker, dynamic sidebar, clock, cctv drawer, and futuristic loader"
```
