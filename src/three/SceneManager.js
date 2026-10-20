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
