import * as THREE from "three/webgpu";
import { CONFIG } from "../constants/config.js";

export class EnvironmentManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.rainParticles = null;
    this.rainCount = CONFIG.MAX_RAIN_PARTICLES || 10000;
    this.isRaining = false;

    this._initRainParticles();
  }

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

  dispose() {
    if (this.rainParticles) {
      this.scene.remove(this.rainParticles);
      this.rainParticles.geometry.dispose();
      this.rainParticles.material.dispose();
      this.rainParticles = null;
    }
  }
}
