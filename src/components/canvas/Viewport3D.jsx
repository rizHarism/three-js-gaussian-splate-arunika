import React, { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import { SceneManager } from "@/three/SceneManager.js";
import { SplatLoader } from "@/three/SplatLoader.js";
import { LabelRenderer } from "@/three/LabelRenderer.js";
import { EnvironmentManager } from "@/three/EnvironmentManager.js";
import { createPowerFloatingLabelElement } from "@/components/labels/PowerFloatingLabel.jsx";
import { createCctvFloatingLabelElement } from "@/components/labels/CctvFloatingLabel.jsx";
import { CONFIG } from "@/constants/config.js";

export default function Viewport3D({
  weatherData,
  onLoadProgress,
  onLoadComplete,
  onLoadError,
  onSceneReady,
  onCctvClick,
}) {
  const containerRef = useRef(null);
  const sceneManagerRef = useRef(null);
  const splatLoaderRef = useRef(null);
  const labelRendererRef = useRef(null);
  const envManagerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Raycaster for coordinate picking on click
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

      // Ignore if user was dragging/orbiting the camera
      if (distance >= 5) return;

      if (!sceneManagerRef.current) return;
      const camera = sceneManagerRef.current.getCamera();
      const scene = sceneManagerRef.current.getScene();
      if (!camera || !scene) return;

      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const rawHits = raycaster.intersectObjects(scene.children, true);

      // Filter out rain particles (THREE.Points) so airborne raindrops don't block clicks
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
        console.log(
          "%cClicked into empty space (no surface hit).",
          "color: #94a3b8; font-style: italic;"
        );
      }
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointerup", handlePointerUp);

    try {
      const sceneManager = new SceneManager(container);
      sceneManagerRef.current = sceneManager;

      // Initialize CSS2DRenderer for floating labels
      const labelRenderer = new LabelRenderer(container);
      labelRendererRef.current = labelRenderer;
      sceneManager.setLabelRenderer(labelRenderer);

      // Initialize EnvironmentManager (Rain particles & environment tone)
      const envManager = new EnvironmentManager(
        sceneManager.getScene(),
        sceneManager.getRenderer()
      );
      envManagerRef.current = envManager;
      sceneManager.setEnvironmentManager(envManager);

      if (onSceneReady) {
        onSceneReady(sceneManager);
      }

      const splatLoader = new SplatLoader();
      splatLoaderRef.current = splatLoader;

      const scene = sceneManager.getScene();

      splatLoader.load(
        CONFIG.MODEL_PATH,
        scene,
        sceneManager.getCamera(),
        sceneManager.getControls(),
        {
          onProgress: ({ percent, loadedMB, totalMB }) => {
            if (onLoadProgress) {
              onLoadProgress(percent, `Loaded ${loadedMB} MB / ${totalMB} MB (${percent}%)`);
            }
          },
          onLoad: () => {
            // Mount floating labels after splat loads successfully
            const powerEl = createPowerFloatingLabelElement(0);
            labelRenderer.addLabel("power-meter", powerEl, CONFIG.LABEL_POWER_METER, scene);

            const cctvRightEl = createCctvFloatingLabelElement("CCTV Depan", () =>
              onCctvClick?.("CCTV Depan (Kanan)")
            );
            labelRenderer.addLabel("cctv-right", cctvRightEl, CONFIG.LABEL_CCTV_RIGHT, scene);

            const cctvLeftEl = createCctvFloatingLabelElement("CCTV Kiri", () =>
              onCctvClick?.("CCTV Area Kiri")
            );
            labelRenderer.addLabel("cctv-left", cctvLeftEl, CONFIG.LABEL_CCTV_LEFT, scene);

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
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointerup", handlePointerUp);

      if (splatLoaderRef.current && sceneManagerRef.current) {
        splatLoaderRef.current.dispose(sceneManagerRef.current.getScene());
      }
      if (envManagerRef.current) {
        envManagerRef.current.dispose();
      }
      if (labelRendererRef.current) {
        labelRendererRef.current.dispose();
      }
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
      }
    };
  }, []);

  // Update environment condition whenever weatherData changes
  useEffect(() => {
    if (envManagerRef.current) {
      envManagerRef.current.setWeatherCondition(weatherData?.condition);
    }
  }, [weatherData]);

  return <div ref={containerRef} id="canvas-container" />;
}
