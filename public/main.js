import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SPZLoader } from "three/addons/loaders/SPZLoader.js";
import { GaussianSplat } from "three/addons/objects/GaussianSplat.js";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const loadingOverlay = document.getElementById("loading-overlay");
const progressBar = document.getElementById("progress-bar");
const statusText = document.getElementById("status-text");
const errorOverlay = document.getElementById("error-overlay");
const errorMessage = document.getElementById("error-message");
const retryBtn = document.getElementById("retry-btn");

THREE.ColorManagement.workingColorSpace = THREE.SRGBColorSpace;

if (retryBtn) {
  retryBtn.addEventListener("click", () => location.reload());
}

/**
 * Display error banner and stop loading sequence.
 * @param {string} message
 */
function showError(message) {
  if (loadingOverlay) loadingOverlay.style.display = "none";
  if (errorMessage) errorMessage.textContent = message;
  if (errorOverlay) errorOverlay.style.display = "flex";
}

async function init() {
  let renderer;

  try {
    statusText.textContent = "Initializing WebGPU renderer...";
    renderer = new THREE.WebGPURenderer({
      autoSort: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    document.body.appendChild(renderer.domElement);
  } catch (err) {
    console.error("WebGPU initialization failed:", err);
    showError(
      "WebGPU / WebGL2 compute is not supported or hardware acceleration is disabled in your browser. " +
        "Please ensure hardware acceleration is enabled in your browser settings (e.g. Chrome with WebGPU enabled).",
    );
    return;
  }

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera setup
  const camera = new THREE.PerspectiveCamera(
    15,
    window.innerWidth / window.innerHeight,
    1,
    100,
  );
  camera.position.set(10, 10, 10);

  // OrbitControls setup
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;

  // Window resize handler
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Continuous animation loop
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  // Load the Gaussian Splat spz model
  loadModel("./model/office30000.spz", scene, camera, controls);
}

/**
 * Load and frame Gaussian Splat PLY model.
 * @param {string} url
 * @param {Scene} scene
 * @param {PerspectiveCamera} camera
 * @param {OrbitControls} controls
 */
function loadModel(url, scene, camera, controls) {
  const loader = new SPZLoader();
  if (statusText) statusText.textContent = "Connecting to model stream...";

  loader.load(
    url,
    // onLoad
    (geometry) => {
      try {
        if (statusText)
          statusText.textContent = "Preparing Gaussian Splats on GPU...";

        console.log(geometry);

        const splat = new GaussianSplat(geometry);
        scene.add(splat);

        // Compute model bounds for auto-framing
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        const sphere = geometry.boundingSphere;
        if (sphere) {
          const center = sphere.center;
          const radius = Math.max(sphere.radius, 1.0);

          // 1. Buat titik fokus baru dari pusat asli objek
          const specificTarget = center.clone();

          // 2. TENTUKAN PERGESERAN FOKUS (Ubah nilai angka di bawah ini sesuai kebutuhan)
          // Contoh: Ingin fokus ke area yang berjarak 2 unit ke KIRI dan 0.5 unit ke ATAS dari pusat asli
          const offsetX = 10.0; // Negatif ke kiri, Positif ke kanan
          const offsetY = 6; // Positif ke atas, Negatif ke bawah
          const offsetZ = 1.0; // Positif ke depan, Negatif ke belakang

          specificTarget.x += offsetX;
          specificTarget.y += offsetY;
          specificTarget.z += offsetZ;

          // 3. Set OrbitControls agar berputar mengelilingi titik spesifik ini
          controls.target.copy(specificTarget);

          // 4. Atur posisi kamera mendekat (Zoom-In) ke titik spesifik tersebut dari Kiri Atas
          // Gunakan pengali radius yang kecil (misal 0.5 s/d 0.8) karena kita ingin close-up/zoom-in
          const closeUpFactor = 0.8;

          camera.position.set(
            specificTarget.x + radius * closeUpFactor, // UBAH KE POSITIF (+) untuk menggeser kamera ke arah Timur (Kanan)
            specificTarget.y + radius * closeUpFactor, // Tetap di Atas objek
            specificTarget.z + radius * closeUpFactor, // UBAH KE POSITIF (+) untuk menggeser kamera ke arah Selatan (Depan)
          );

          // ==========================================
          // 4.5. PUTAR BERLAWANAN ARAH JARUM JAM SEDIKIT
          // ==========================================
          // Hitung jarak/vektor relatif dari kamera ke target
          const offset = new THREE.Vector3().subVectors(
            camera.position,
            specificTarget,
          );

          // Tentukan sudut rotasi dalam radian (Math.PI / 18 adalah 10 derajat)
          // Jika ingin putar lebih jauh, besarkan angkanya (misal Math.PI / 12 untuk 15 derajat)
          const angle = Math.PI / 18;

          // Putar offset pada sumbu Y (horizontal) berlawanan arah jarum jam
          offset.applyAxisAngle(new THREE.Vector3(1, -3, 0), angle);

          // Kembalikan posisi kamera yang baru berdasarkan target + offset yang sudah diputar
          camera.position.copy(specificTarget).add(offset);
          // ==========================================

          // 5. Kunci pandangan kamera ke titik spesifik dan update kontrol
          camera.lookAt(specificTarget);
          controls.update();

          // 6. Pertahankan clipping plane agar model dekat tidak terpotong (flicker)
          camera.near = 0.01; // Dibuat sangat kecil agar saat zoom dekat objek tidak hilang
          camera.far = radius * 100;
          camera.updateProjectionMatrix();
          controls.update();
        }

        if (loadingOverlay) {
          loadingOverlay.style.opacity = "0";
          setTimeout(() => {
            loadingOverlay.style.display = "none";
          }, 500);
        }
      } catch (splatErr) {
        console.error("Error creating Gaussian Splat mesh:", splatErr);
        showError(
          "Failed to process Gaussian Splat on GPU: " +
            (splatErr?.message || splatErr),
        );
      }
    },
    // onProgress
    (xhr) => {
      const loadedMB = (xhr.loaded / 1048576).toFixed(1);
      if (xhr.lengthComputable && xhr.total > 0) {
        const totalMB = (xhr.total / 1048576).toFixed(1);
        const percent = Math.min(
          100,
          Math.round((xhr.loaded / xhr.total) * 100),
        );
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (statusText)
          statusText.textContent = `Loaded ${loadedMB} MB / ${totalMB} MB (${percent}%)`;
      } else {
        if (statusText) statusText.textContent = `Downloaded ${loadedMB} MB...`;
        if (progressBar)
          progressBar.style.width = `${Math.min(95, (xhr.loaded / (130 * 1048576)) * 100)}%`;
      }
    },
    // onError
    (err) => {
      console.error("Model loading error:", err);
      showError(
        "Failed to load '" +
          url +
          "': " +
          (err?.message || "File not found or network connection failed."),
      );
    },
  );

  // helper to get coordinate when click mouse gausian object

  window.addEventListener("click", (event) => {
    // 2. Convert the raw mouse click position into Normalized Device Coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 3. Update the ray caster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // 4. Calculate objects intersecting the picking ray
    // (Pass 'scene.children' to test against everything, or an array of specific meshes)
    const intersects = raycaster.intersectObjects(scene.children, true);

    // 5. If the ray hit an object, log the coordinates
    if (intersects.length > 0) {
      // 'point' contains the precise Vector3 (X, Y, Z) coordinates of the click
      const clickPoint = intersects[0].point;

      console.log("Clicked 3D Coordinates:", clickPoint);
      console.log(`X: ${clickPoint.x}, Y: ${clickPoint.y}, Z: ${clickPoint.z}`);
    } else {
      console.log("Clicked into empty space (no object hit).");
    }
  });
}

init();
