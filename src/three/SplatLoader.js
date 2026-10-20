import * as THREE from "three/webgpu";
import { SPZLoader } from "three/addons/loaders/SPZLoader.js";
import { GaussianSplat } from "three/addons/objects/GaussianSplat.js";
import { CONFIG } from "../constants/config.js";

export class SplatLoader {
  constructor() {
    this.loader = new SPZLoader();
    this.splatMesh = null;
    this.isDisposed = false;
  }

  load(url, scene, camera, controls, callbacks = {}) {
    const { onProgress, onLoad, onError } = callbacks;

    this.loader.load(
      url,
      (geometry) => {
        if (this.isDisposed) {
          geometry.dispose();
          return;
        }

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
              new THREE.Vector3(1, -3, 0).normalize(),
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
    this.isDisposed = true;
    if (this.splatMesh) {
      if (scene) {
        scene.remove(this.splatMesh);
      }
      this.splatMesh.material?.dispose();
      if (this.splatMesh.geometry) {
        this.splatMesh.geometry.dispose();
      }
      this.splatMesh = null;
    }
  }
}
