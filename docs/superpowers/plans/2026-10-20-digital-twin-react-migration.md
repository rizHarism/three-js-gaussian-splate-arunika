# Digital Twin React Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrasi Gaussian Splatting 3D viewer Arunika Office dari Vite + Vanilla JS monolitik ke arsitektur modular Vite + React SPA, dilengkapi integrasi cuaca real-time, simulasi IoT daya listrik, label CSS2D interaktif (CCTV & Power), sidebar dashboard glassmorphism, dan efek visual lingkungan.

**Architecture:** Memisahkan aplikasi menjadi tiga subsistem terisolasi: (1) Engine 3D Three.js/WebGPU pure JS (`src/three/`), (2) Data Provider pure JS (`src/services/`), dan (3) Antarmuka UI deklaratif React (`src/components/`). Komunikasi dipusatkan pada `App.jsx` melalui reactive state dan diteruskan secara imperatif ke Three.js saat diperlukan.

**Tech Stack:** React 18/19, Three.js r186 (WebGPU, SPZLoader, GaussianSplat, CSS2DRenderer, PostProcessing), Vite, Lucide-React, OpenWeatherMap REST API.

---

## Chunk 1: Scaffolding, Core 3D Engine & UI Parity

### Task 1: Project Setup, React Dependencies & Static Asset Migration

**Files:**
- Modify: `package.json`
- Modify: `vite.config.mjs`
- Modify: `.gitignore`
- Create: `.env.example`
- Move: `model/office30000.spz` → `public/model/office30000.spz`
- Create: `src/constants/config.js`

- [ ] **Step 1: Install React, React-DOM, @vitejs/plugin-react, and lucide-react**

Run:
```powershell
npm install react react-dom lucide-react
npm install -D @vitejs/plugin-react
```
Expected output: packages added to `package.json` dependencies and devDependencies.

- [ ] **Step 2: Update `.gitignore` and create `.env.example`**

Write `.gitignore`:
```text
node_modules
dist
.env
```

Write `.env.example`:
```text
# OpenWeatherMap API Key (Free tier)
VITE_OWM_API_KEY=your_openweathermap_api_key_here
```

- [ ] **Step 3: Move model file to `public/model/`**

Run:
```powershell
New-Item -ItemType Directory -Force -Path "public/model"
Move-Item -Path "model/office30000.spz" -Destination "public/model/office30000.spz"
Remove-Item -Path "model" -Recurse -Force
```
Expected output: `Test-Path "public/model/office30000.spz"` returns `True`.

- [ ] **Step 4: Update `vite.config.mjs`**

Write `vite.config.mjs`:
```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Create `src/constants/config.js`**

Write `src/constants/config.js`:
```javascript
export const CONFIG = {
  // Model
  MODEL_PATH: "/model/office30000.spz",

  // Camera Defaults
  CAMERA_FOV: 15,
  CAMERA_NEAR: 0.01,
  CAMERA_FAR: 100,
  CAMERA_POSITION: { x: 10, y: 10, z: 10 },

  // Framing Offset (applied after bounds calculation)
  FRAMING_OFFSET: { x: 10.0, y: 6.0, z: 1.0 },
  FRAMING_CLOSE_UP_FACTOR: 0.8,
  FRAMING_ROTATION_ANGLE: Math.PI / 18, // 10 degrees

  // Weather Service
  OWM_BASE_URL: "https://api.openweathermap.org/data/2.5/weather",
  OWM_LOCATION: { lat: -8.0954, lon: 112.1611 }, // Blitar
  WEATHER_POLL_INTERVAL_MS: 5 * 60 * 1000, // 5 menit

  // IoT Simulation
  IOT_MIN_WATTS: 1200,
  IOT_MAX_WATTS: 7200,
  IOT_MIN_INTERVAL_MS: 3000,
  IOT_MAX_INTERVAL_MS: 5000,

  // CSS2D Label Coordinates (initial estimates in world space)
  LABEL_POWER_METER: { x: 2.5, y: 1.2, z: -1.0 },
  LABEL_CCTV_RIGHT: { x: 4.8, y: 2.8, z: 0.5 },
  LABEL_CCTV_LEFT: { x: -3.5, y: 2.8, z: -0.2 },

  // Environment & Visuals
  MAX_RAIN_PARTICLES: 5000,
};
```

- [ ] **Step 6: Verify config and Vite setup**

Run:
```powershell
npx vite --version
```
Expected output: Prints Vite version without errors.

- [ ] **Step 7: Commit setup and static assets**

Run:
```powershell
git add package.json package-lock.json vite.config.mjs .gitignore .env.example public/model/office30000.spz src/constants/config.js
git commit -m "chore: setup react, vite config, config constants, and move model to public"
```

---

### Task 2: Core Three.js Engine Modularization (`SceneManager.js` & `SplatLoader.js`)

**Files:**
- Create: `src/three/SceneManager.js`
- Create: `src/three/SplatLoader.js`

- [ ] **Step 1: Implement `src/three/SceneManager.js`**

Write `src/three/SceneManager.js`:
```javascript
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CONFIG } from "../constants/config.js";

THREE.ColorManagement.workingColorSpace = THREE.SRGBColorSpace;

export class SceneManager {
  constructor(containerElement) {
    this.container = containerElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.labelRenderer = null;
    this.environmentManager = null;
    this.clock = new THREE.Clock();
    this._resizeHandler = this._handleResize.bind(this);

    this._init();
  }

  _init() {
    this.renderer = new THREE.WebGPURenderer({
      autoSort: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.CAMERA_NEAR,
      CONFIG.CAMERA_FAR
    );
    this.camera.position.set(
      CONFIG.CAMERA_POSITION.x,
      CONFIG.CAMERA_POSITION.y,
      CONFIG.CAMERA_POSITION.z
    );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;

    window.addEventListener("resize", this._resizeHandler);

    this.clock.start();

    this.renderer.setAnimationLoop(() => {
      const delta = this.clock.getDelta();

      this.controls.update();

      if (this.environmentManager) {
        this.environmentManager.update(delta);
      }

      this.renderer.render(this.scene, this.camera);

      if (this.labelRenderer) {
        this.labelRenderer.render(this.scene, this.camera);
      }
    });
  }

  setLabelRenderer(labelRenderer) {
    this.labelRenderer = labelRenderer;
  }

  setEnvironmentManager(environmentManager) {
    this.environmentManager = environmentManager;
  }

  _handleResize() {
    if (!this.camera || !this.renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    if (this.labelRenderer) {
      this.labelRenderer.setSize(width, height);
    }
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getControls() {
    return this.controls;
  }

  getRenderer() {
    return this.renderer;
  }

  dispose() {
    window.removeEventListener("resize", this._resizeHandler);
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }
    if (this.controls) {
      this.controls.dispose();
    }
  }
}
```

- [ ] **Step 2: Implement `src/three/SplatLoader.js`**

Write `src/three/SplatLoader.js`:
```javascript
import * as THREE from "three/webgpu";
import { SPZLoader } from "three/addons/loaders/SPZLoader.js";
import { GaussianSplat } from "three/addons/objects/GaussianSplat.js";
import { CONFIG } from "../constants/config.js";

export class SplatLoader {
  constructor() {
    this.loader = new SPZLoader();
    this.splatMesh = null;
  }

  load(url, scene, camera, controls, callbacks = {}) {
    const { onProgress, onLoad, onError } = callbacks;

    this.loader.load(
      url,
      (geometry) => {
        try {
          const splat = new GaussianSplat(geometry);
          scene.add(splat);
          this.splatMesh = splat;

          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();

          const sphere = geometry.boundingSphere;
          if (sphere) {
            const center = sphere.center;
            const radius = Math.max(sphere.radius, 1.0);

            const specificTarget = center.clone();
            specificTarget.x += CONFIG.FRAMING_OFFSET.x;
            specificTarget.y += CONFIG.FRAMING_OFFSET.y;
            specificTarget.z += CONFIG.FRAMING_OFFSET.z;

            controls.target.copy(specificTarget);

            const closeUpFactor = CONFIG.FRAMING_CLOSE_UP_FACTOR;
            camera.position.set(
              specificTarget.x + radius * closeUpFactor,
              specificTarget.y + radius * closeUpFactor,
              specificTarget.z + radius * closeUpFactor
            );

            const offset = new THREE.Vector3().subVectors(
              camera.position,
              specificTarget
            );
            offset.applyAxisAngle(
              new THREE.Vector3(1, -3, 0),
              CONFIG.FRAMING_ROTATION_ANGLE
            );
            camera.position.copy(specificTarget).add(offset);

            camera.lookAt(specificTarget);
            camera.near = CONFIG.CAMERA_NEAR;
            camera.far = radius * 100;
            camera.updateProjectionMatrix();
            controls.update();
          }

          if (onLoad) onLoad(splat);
        } catch (err) {
          if (onError) onError(err);
        }
      },
      (xhr) => {
        if (onProgress) {
          const percent =
            xhr.lengthComputable && xhr.total > 0
              ? Math.min(100, Math.round((xhr.loaded / xhr.total) * 100))
              : Math.min(95, Math.round((xhr.loaded / (130 * 1048576)) * 100));
          const loadedMB = (xhr.loaded / 1048576).toFixed(1);
          const totalMB = xhr.total > 0 ? (xhr.total / 1048576).toFixed(1) : "130.0";
          onProgress({ percent, loadedMB, totalMB });
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  }

  dispose(scene) {
    if (this.splatMesh && scene) {
      scene.remove(this.splatMesh);
      if (this.splatMesh.geometry) {
        this.splatMesh.geometry.dispose();
      }
      this.splatMesh = null;
    }
  }
}
```

- [ ] **Step 3: Verification of 3D engine syntax and exports**

Run:
```powershell
node -e "import('./src/three/SceneManager.js'); import('./src/three/SplatLoader.js'); console.log('3D modules syntax valid')"
```
Expected output: `3D modules syntax valid` (or passes module syntax check without parse errors).

- [ ] **Step 4: Commit 3D modules**

Run:
```powershell
git add src/three/SceneManager.js src/three/SplatLoader.js
git commit -m "feat(three): add SceneManager and SplatLoader modules"
```

---

### Task 3: React Scaffolding, Complete `App.css`, HUD & Parity Checkpoint

**Files:**
- Create: `src/App.css`
- Create: `src/components/canvas/Viewport3D.jsx`
- Create: `src/components/hud/TitleBadge.jsx`
- Create: `src/components/hud/ControlsHint.jsx`
- Create: `src/components/overlays/LoadingOverlay.jsx`
- Create: `src/components/overlays/ErrorOverlay.jsx`
- Create: `src/App.jsx`
- Create: `src/main.jsx`
- Modify: `index.html`

- [ ] **Step 1: Write complete `src/App.css` with container, HUD, glassmorphism, and modal styles**

Write `src/App.css`:
```css
* {
  box-sizing: border-box;
}

body,
html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #0b0d13;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #e2e8f0;
  user-select: none;
}

.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

#canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
}

/* CSS2D Layer */
.css2d-layer {
  pointer-events: none;
  z-index: 2;
}

/* HUD Layer */
#hud {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
}

/* Title Badge */
#title-badge {
  align-self: flex-start;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 18px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

#title-badge h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 8px;
}

#title-badge .tag {
  background: rgba(59, 130, 246, 0.25);
  color: #60a5fa;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid rgba(96, 165, 250, 0.3);
}

#title-badge .model-name {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

/* Controls Hint */
#controls-hint {
  align-self: center;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  padding: 8px 18px;
  font-size: 12px;
  color: #94a3b8;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  display: flex;
  gap: 14px;
  align-items: center;
  pointer-events: auto;
}

#controls-hint span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

#controls-hint kbd {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

/* Overlays */
#loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(11, 13, 19, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  transition: opacity 0.5s ease, visibility 0.5s ease;
  pointer-events: auto;
}

.loading-card {
  background: rgba(23, 28, 43, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 36px 44px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
}

#spinner {
  width: 44px;
  height: 44px;
  margin: 0 auto 20px auto;
  border: 3px solid rgba(96, 165, 250, 0.15);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-title {
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 6px;
}

.loading-subtitle {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 22px;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 14px;
}

#progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  border-radius: 9999px;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

#status-text {
  font-size: 13px;
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
}

#error-overlay {
  position: fixed;
  inset: 0;
  background: rgba(11, 13, 19, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: auto;
}

.error-card {
  background: rgba(30, 20, 25, 0.9);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 20px;
  padding: 36px 40px;
  max-width: 460px;
  width: 90%;
  text-align: center;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
}

.error-icon {
  font-size: 38px;
  margin-bottom: 16px;
  display: inline-block;
}

.error-title {
  font-size: 19px;
  font-weight: 600;
  color: #fca5a5;
  margin-bottom: 10px;
}

#error-message {
  font-size: 13px;
  line-height: 1.6;
  color: #e2e8f0;
  margin-bottom: 24px;
  word-break: break-word;
}

#retry-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 24px;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

#retry-btn:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

/* Sidebar Dashboard */
.sidebar-container {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 320px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 20;
  pointer-events: auto;
}

.sidebar-panel {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.sidebar-panel-top {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sidebar-panel-bottom {
  flex: 1;
  overflow-y: auto;
}

/* 3D Floating Labels */
.floating-label-badge {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #f8fafc;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
  user-select: none;
}

.floating-label-badge:hover {
  transform: scale(1.08);
  border-color: #38bdf8;
}

.floating-label-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

/* CCTV Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  width: 90%;
  max-width: 520px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8);
}
```

- [ ] **Step 2: Create HUD components `TitleBadge.jsx` and `ControlsHint.jsx`**

Write `src/components/hud/TitleBadge.jsx`:
```jsx
import React from "react";

export default function TitleBadge() {
  return (
    <div id="title-badge">
      <h1>
        <span>Gaussian Splat</span>
        <span className="tag">WebGPU</span>
      </h1>
      <div className="model-name">Arunika Office</div>
    </div>
  );
}
```

Write `src/components/hud/ControlsHint.jsx`:
```jsx
import React from "react";

export default function ControlsHint() {
  return (
    <div id="controls-hint">
      <span><kbd>Left Click</kbd> Rotate</span>
      <span><kbd>Right Click</kbd> Pan</span>
      <span><kbd>Scroll</kbd> Zoom</span>
    </div>
  );
}
```

- [ ] **Step 3: Create Overlay components `LoadingOverlay.jsx` and `ErrorOverlay.jsx`**

Write `src/components/overlays/LoadingOverlay.jsx`:
```jsx
import React from "react";

export default function LoadingOverlay({ isLoading, progress, statusText }) {
  if (!isLoading) return null;

  return (
    <div id="loading-overlay">
      <div className="loading-card">
        <div id="spinner"></div>
        <div className="loading-title">Loading 3D Scene</div>
        <div className="loading-subtitle">Fetching and unpacking Gaussian Splat data</div>
        <div className="progress-track">
          <div id="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        <div id="status-text">{statusText}</div>
      </div>
    </div>
  );
}
```

Write `src/components/overlays/ErrorOverlay.jsx`:
```jsx
import React from "react";

export default function ErrorOverlay({ error }) {
  if (!error) return null;

  return (
    <div id="error-overlay">
      <div className="error-card">
        <div className="error-icon">⚠️</div>
        <div className="error-title">Viewer Initialization Error</div>
        <div id="error-message">{error}</div>
        <button id="retry-btn" onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/components/canvas/Viewport3D.jsx`**

Write `src/components/canvas/Viewport3D.jsx`:
```jsx
import React, { useEffect, useRef } from "react";
import { SceneManager } from "@/three/SceneManager.js";
import { SplatLoader } from "@/three/SplatLoader.js";
import { CONFIG } from "@/constants/config.js";

export default function Viewport3D({
  onLoadProgress,
  onLoadComplete,
  onLoadError,
  onSceneReady,
}) {
  const containerRef = useRef(null);
  const sceneManagerRef = useRef(null);
  const splatLoaderRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const sceneManager = new SceneManager(containerRef.current);
      sceneManagerRef.current = sceneManager;

      if (onSceneReady) {
        onSceneReady(sceneManager);
      }

      const splatLoader = new SplatLoader();
      splatLoaderRef.current = splatLoader;

      splatLoader.load(
        CONFIG.MODEL_PATH,
        sceneManager.getScene(),
        sceneManager.getCamera(),
        sceneManager.getControls(),
        {
          onProgress: ({ percent, loadedMB, totalMB }) => {
            if (onLoadProgress) {
              onLoadProgress(percent, `Loaded ${loadedMB} MB / ${totalMB} MB (${percent}%)`);
            }
          },
          onLoad: () => {
            if (onLoadComplete) onLoadComplete();
          },
          onError: (err) => {
            if (onLoadError) {
              onLoadError(
                err?.message || "Failed to load Gaussian Splat model on GPU."
              );
            }
          },
        }
      );
    } catch (err) {
      if (onLoadError) {
        onLoadError(
          "WebGPU is not supported or hardware acceleration is disabled. " +
            (err?.message || err)
        );
      }
    }

    return () => {
      if (splatLoaderRef.current && sceneManagerRef.current) {
        splatLoaderRef.current.dispose(sceneManagerRef.current.getScene());
      }
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
      }
    };
  }, []);

  return <div ref={containerRef} id="canvas-container" />;
}
```

- [ ] **Step 5: Write `src/App.jsx`, `src/main.jsx` and update `index.html`**

Write `src/App.jsx`:
```jsx
import React, { useState } from "react";
import Viewport3D from "./components/canvas/Viewport3D.jsx";
import TitleBadge from "./components/hud/TitleBadge.jsx";
import ControlsHint from "./components/hud/ControlsHint.jsx";
import LoadingOverlay from "./components/overlays/LoadingOverlay.jsx";
import ErrorOverlay from "./components/overlays/ErrorOverlay.jsx";
import "./App.css";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing WebGPU renderer...");
  const [loadError, setLoadError] = useState(null);

  const handleProgress = (percent, text) => {
    setLoadingProgress(percent);
    setStatusText(text);
  };

  const handleComplete = () => {
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const handleError = (msg) => {
    setIsLoading(false);
    setLoadError(msg);
  };

  return (
    <div className="app-container">
      <Viewport3D
        onLoadProgress={handleProgress}
        onLoadComplete={handleComplete}
        onLoadError={handleError}
      />

      <div id="hud">
        <TitleBadge />
        <ControlsHint />
      </div>

      <LoadingOverlay
        isLoading={isLoading}
        progress={loadingProgress}
        statusText={statusText}
      />

      <ErrorOverlay error={loadError} />
    </div>
  );
}
```

Write `src/main.jsx`:
```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
```

Update `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Gaussian Splat Viewer — Arunika Office</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 6: Build dry run to verify React parity**

Run:
```powershell
npx vite build
```
Expected output: Build completed successfully and bundles generated in `dist/`.

- [ ] **Step 7: Commit React parity checkpoint**

Run:
```powershell
git add index.html src/
git commit -m "feat: complete React migration parity with modular 3D engine"
```

---

## Chunk 2: Interactive CSS2D Labels & Data Providers

### Task 4: CSS2DRenderer & 3D Floating Labels

**Files:**
- Create: `src/three/LabelRenderer.js`
- Create: `src/components/labels/PowerFloatingLabel.jsx`
- Create: `src/components/labels/CctvFloatingLabel.jsx`
- Modify: `src/components/canvas/Viewport3D.jsx`

- [ ] **Step 1: Implement `src/three/LabelRenderer.js`**

Write `src/three/LabelRenderer.js`:
```javascript
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

export class LabelRenderer {
  constructor(containerElement) {
    this.container = containerElement;
    this.renderer = new CSS2DRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.top = "0px";
    this.renderer.domElement.style.left = "0px";
    this.renderer.domElement.style.pointerEvents = "none";
    this.renderer.domElement.className = "css2d-layer";

    this.container.appendChild(this.renderer.domElement);
    this.labels = new Map();
  }

  addLabel(id, domElement, position, scene) {
    domElement.style.pointerEvents = "auto";
    const cssObject = new CSS2DObject(domElement);
    cssObject.position.set(position.x, position.y, position.z);
    scene.add(cssObject);
    this.labels.set(id, cssObject);
    return cssObject;
  }

  removeLabel(id, scene) {
    const cssObject = this.labels.get(id);
    if (cssObject && scene) {
      scene.remove(cssObject);
      this.labels.delete(id);
    }
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  dispose() {
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.labels.clear();
  }
}
```

- [ ] **Step 2: Create `PowerFloatingLabel.jsx` and `CctvFloatingLabel.jsx`**

Write `src/components/labels/PowerFloatingLabel.jsx`:
```jsx
import React from "react";

/**
 * Creates the DOM element for Power Meter floating badge.
 * Updates are done directly on span#power-watt-value for 60fps performance without re-render.
 */
export function createPowerFloatingLabelElement(initialWatts = 0) {
  const container = document.createElement("div");
  container.className = "floating-label-badge";
  container.innerHTML = `
    <span class="floating-label-pulse"></span>
    <span>Daya:</span>
    <span id="power-watt-value" style="color: #38bdf8; font-variant-numeric: tabular-nums;">${initialWatts}W</span>
  `;
  return container;
}

export function updatePowerFloatingLabelValue(watts) {
  const el = document.getElementById("power-watt-value");
  if (el) {
    el.textContent = `${watts}W`;
  }
}
```

Write `src/components/labels/CctvFloatingLabel.jsx`:
```jsx
import React from "react";

/**
 * Creates the DOM element for CCTV floating badge.
 * Dispatches onCctvClick callback when clicked.
 */
export function createCctvFloatingLabelElement(label = "CCTV Front", onClick) {
  const container = document.createElement("div");
  container.className = "floating-label-badge";
  container.style.borderColor = "rgba(129, 140, 248, 0.5)";
  container.innerHTML = `
    <span>📹</span>
    <span>${label}</span>
  `;
  if (onClick) {
    container.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
  }
  return container;
}
```

- [ ] **Step 3: Connect `LabelRenderer` into `Viewport3D.jsx`**

Update `src/components/canvas/Viewport3D.jsx`:
- Initialize `LabelRenderer` and attach to `sceneManager.setLabelRenderer(labelRenderer)`.
- Mount `LABEL_POWER_METER`, `LABEL_CCTV_RIGHT`, and `LABEL_CCTV_LEFT` from `CONFIG`.
- Wire `onCctvClick` callback props to CCTV label clicks.

- [ ] **Step 4: Verify build with labels**

Run:
```powershell
npx vite build
```
Expected output: Build succeeds with 0 errors.

- [ ] **Step 5: Commit CSS2D implementation**

Run:
```powershell
git add src/three/LabelRenderer.js src/components/labels/ src/components/canvas/Viewport3D.jsx
git commit -m "feat(labels): add CSS2DRenderer and 3D floating labels"
```

---

### Task 5: Data Services (Weather & IoT Power Simulation)

**Files:**
- Create: `src/services/weatherService.js`
- Create: `src/services/iotSimulationService.js`

- [ ] **Step 1: Implement `src/services/weatherService.js`**

Write `src/services/weatherService.js`:
```javascript
import { CONFIG } from "../constants/config.js";

const MOCK_WEATHER_DATA = {
  condition: "Clouds",
  temperature: 29,
  humidity: 78,
  windSpeed: 3.5,
  description: "Berawan Tebal",
  icon: "04d",
  isOffline: true,
};

let pollIntervalId = null;

export const weatherService = {
  async fetchOnce() {
    const apiKey = import.meta.env.VITE_OWM_API_KEY;

    if (!apiKey) {
      console.warn("VITE_OWM_API_KEY is not set. Using mock weather data.");
      return { ...MOCK_WEATHER_DATA, isOffline: true };
    }

    try {
      const { lat, lon } = CONFIG.OWM_LOCATION;
      const url = `${CONFIG.OWM_BASE_URL}?lat=${lat}&lon=${lon}&units=metric&lang=id&appid=${apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`OpenWeatherMap responded with status ${res.status}`);
      }

      const data = await res.json();
      return {
        condition: data.weather?.[0]?.main || "Clouds",
        temperature: Math.round(data.main?.temp ?? 29),
        humidity: data.main?.humidity ?? 75,
        windSpeed: data.wind?.speed ?? 3.0,
        description: data.weather?.[0]?.description || "Berawan",
        icon: data.weather?.[0]?.icon || "04d",
        isOffline: false,
      };
    } catch (err) {
      console.error("Weather fetch failed, falling back to mock:", err);
      return { ...MOCK_WEATHER_DATA, isOffline: true };
    }
  },

  startPolling(callback) {
    this.stopPolling();
    this.fetchOnce().then(callback);

    pollIntervalId = setInterval(async () => {
      const data = await this.fetchOnce();
      callback(data);
    }, CONFIG.WEATHER_POLL_INTERVAL_MS);
  },

  stopPolling() {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  },
};
```

- [ ] **Step 2: Implement `src/services/iotSimulationService.js`**

Write `src/services/iotSimulationService.js`:
```javascript
import { CONFIG } from "../constants/config.js";

let timerId = null;

export const iotSimulationService = {
  start(callback) {
    this.stop();

    const triggerNext = () => {
      const minWatts = CONFIG.IOT_MIN_WATTS;
      const maxWatts = CONFIG.IOT_MAX_WATTS;
      const watts = Math.floor(minWatts + Math.random() * (maxWatts - minWatts));

      callback(watts);

      const minInterval = CONFIG.IOT_MIN_INTERVAL_MS;
      const maxInterval = CONFIG.IOT_MAX_INTERVAL_MS;
      const nextDelay = Math.floor(minInterval + Math.random() * (maxInterval - minInterval));

      timerId = setTimeout(triggerNext, nextDelay);
    };

    triggerNext();
  },

  stop() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  },
};
```

- [ ] **Step 3: Verification of services via Node evaluation**

Run:
```powershell
node -e "import('./src/services/iotSimulationService.js'); console.log('IoT service valid');"
```
Expected output: `IoT service valid`.

- [ ] **Step 4: Commit data services**

Run:
```powershell
git add src/services/
git commit -m "feat(services): add weatherService and iotSimulationService"
```

---

## Chunk 3: Dashboard UI, CCTV Modal & Visual Environment Sync

### Task 6: Sidebar Dashboard & CCTV Modal Components

**Files:**
- Create: `src/components/dashboard/WeatherCard.jsx`
- Create: `src/components/dashboard/PowerWidget.jsx`
- Create: `src/components/dashboard/AboutPanel.jsx`
- Create: `src/components/dashboard/Sidebar.jsx`
- Create: `src/components/modals/CctvModal.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Implement `WeatherCard.jsx`, `PowerWidget.jsx`, `AboutPanel.jsx`**

Write `src/components/dashboard/WeatherCard.jsx`:
```jsx
import React from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets, WifiOff } from "lucide-react";

export default function WeatherCard({ weatherData }) {
  if (!weatherData) return null;

  const { condition, temperature, humidity, windSpeed, description, isOffline } = weatherData;

  const renderIcon = () => {
    switch (condition?.toLowerCase()) {
      case "rain":
        return <CloudRain size={28} color="#38bdf8" />;
      case "clear":
        return <Sun size={28} color="#f59e0b" />;
      default:
        return <Cloud size={28} color="#94a3b8" />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
          Cuaca Area (Blitar)
        </span>
        {isOffline && (
          <span style={{ fontSize: "10px", color: "#f87171", display: "flex", alignItems: "center", gap: "4px" }}>
            <WifiOff size={12} /> Offline Mode
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {renderIcon()}
          <div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#f8fafc" }}>
              {temperature}°C
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", textTransform: "capitalize" }}>
              {description}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "12px", color: "#cbd5e1" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Droplets size={14} color="#38bdf8" /> {humidity}%
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Wind size={14} color="#a5b4fc" /> {windSpeed} m/s
        </span>
      </div>
    </div>
  );
}
```

Write `src/components/dashboard/PowerWidget.jsx`:
```jsx
import React from "react";
import { Zap } from "lucide-react";

export default function PowerWidget({ powerWatts }) {
  // Simple dummy bar chart levels (5 bars)
  const percentage = Math.min(100, Math.round((powerWatts / 7200) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
          Konsumsi Daya (IoT Mock)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f59e0b", fontSize: "13px", fontWeight: 700 }}>
          <Zap size={14} />
          {powerWatts.toLocaleString()} W
        </span>
      </div>

      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "9999px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            background: "linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
```

Write `src/components/dashboard/AboutPanel.jsx`:
```jsx
import React from "react";
import { Info } from "lucide-react";

export default function AboutPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>
        <Info size={14} />
        <span>TENTANG APLIKASI</span>
      </div>

      <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.6", color: "#cbd5e1" }}>
        Digital Twin fasad kantor <strong>Arunika Saha Vikasa</strong> menggunakan 3D Gaussian Splatting dan WebGPU.
        Menghubungkan data cuaca real-time Blitar dan simulasi sensor daya listrik eksterior.
      </p>

      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
        © 2026 Arunika Research & Development
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `Sidebar.jsx` and `CctvModal.jsx`**

Write `src/components/dashboard/Sidebar.jsx`:
```jsx
import React from "react";
import WeatherCard from "./WeatherCard.jsx";
import PowerWidget from "./PowerWidget.jsx";
import AboutPanel from "./AboutPanel.jsx";

export default function Sidebar({ weatherData, powerWatts }) {
  return (
    <aside className="sidebar-container">
      <div className="sidebar-panel sidebar-panel-top">
        <WeatherCard weatherData={weatherData} />
        <PowerWidget powerWatts={powerWatts} />
      </div>
      <div className="sidebar-panel sidebar-panel-bottom">
        <AboutPanel />
      </div>
    </aside>
  );
}
```

Write `src/components/modals/CctvModal.jsx`:
```jsx
import React, { useEffect } from "react";
import { X, VideoOff } from "lucide-react";

export default function CctvModal({ isOpen, onClose, cctvName = "Front Office CCTV" }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <span style={{ fontWeight: 600, fontSize: "15px", color: "#f8fafc" }}>{cctvName}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "30px 20px", textAlign: "center", background: "rgba(0,0,0,0.4)" }}>
          <VideoOff size={44} color="#f87171" style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#f1f5f9", marginBottom: "4px" }}>
            Feed Sedang Maintenance
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            Kamera keamanan eksterior sedang dalam kalibrasi stream. Coba beberapa saat lagi.
          </div>
        </div>

        <div style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={onClose}
            style={{
              background: "#334155",
              color: "#f8fafc",
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire reactive subscriptions & modal state in `App.jsx`**

Update `src/App.jsx` to:
- Subscribe to `weatherService.startPolling((data) => setWeatherData(data))` on mount.
- Subscribe to `iotSimulationService.start((watts) => { setPowerWatts(watts); updatePowerFloatingLabelValue(watts); })`.
- Handle `isCctvModalOpen` toggled via `Viewport3D` callback props.
- Mount `<Sidebar weatherData={weatherData} powerWatts={powerWatts} />` and `<CctvModal isOpen={isCctvModalOpen} onClose={() => setIsCctvModalOpen(false)} />`.

- [ ] **Step 4: Build verification for Task 6**

Run:
```powershell
npx vite build
```
Expected output: Build completed successfully.

- [ ] **Step 5: Commit dashboard and modal**

Run:
```powershell
git add src/components/dashboard/ src/components/modals/ src/App.jsx
git commit -m "feat(ui): add sidebar dashboard, power widget, weather card, and CCTV modal"
```

---

### Task 7: Environment & Weather Visual Synchronization

**Files:**
- Create: `src/three/EnvironmentManager.js`
- Modify: `src/three/SceneManager.js`
- Modify: `src/components/canvas/Viewport3D.jsx`

- [ ] **Step 1: Implement `src/three/EnvironmentManager.js`**

Write `src/three/EnvironmentManager.js`:
```javascript
import * as THREE from "three/webgpu";
import { CONFIG } from "../constants/config.js";

export class EnvironmentManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.rainParticles = null;
    this.rainCount = CONFIG.MAX_RAIN_PARTICLES;
    this.isRaining = false;

    this._initRainParticles();
  }

  _initRainParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
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

  setWeatherCondition(condition) {
    const isRain = condition?.toLowerCase() === "rain";
    this.isRaining = isRain;

    if (this.rainParticles) {
      this.rainParticles.visible = isRain;
    }

    // Adjust scene background tone
    if (isRain) {
      this.scene.background = new THREE.Color(0x0a101d);
    } else {
      this.scene.background = new THREE.Color(0x000000);
    }
  }

  update(delta) {
    if (!this.isRaining || !this.rainParticles) return;

    const positions = this.rainParticles.geometry.attributes.position.array;
    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3 + 1] -= 25 * delta;
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 30;
      }
    }
    this.rainParticles.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (this.rainParticles) {
      this.scene.remove(this.rainParticles);
      this.rainParticles.geometry.dispose();
      this.rainParticles.material.dispose();
      this.rainParticles = null;
    }
  }
}
```

- [ ] **Step 2: Connect `EnvironmentManager` into `SceneManager` & `Viewport3D.jsx`**

Update `src/components/canvas/Viewport3D.jsx` to:
- Instantiate `EnvironmentManager(sceneManager.getScene(), sceneManager.getRenderer())`.
- Register via `sceneManager.setEnvironmentManager(envManager)`.
- In `useEffect([weatherData])`, invoke `envManager.setWeatherCondition(weatherData?.condition)`.
- Cleanup on unmount.

- [ ] **Step 3: Full production build & lint verification**

Run:
```powershell
npx vite build
```
Expected output:
```text
✓ built in ...ms
dist/index.html
dist/assets/...
```

- [ ] **Step 4: Commit environment effects and complete plan**

Run:
```powershell
git add src/three/EnvironmentManager.js src/components/canvas/Viewport3D.jsx
git commit -m "feat(three): add EnvironmentManager for rain particles and weather sync"
```
