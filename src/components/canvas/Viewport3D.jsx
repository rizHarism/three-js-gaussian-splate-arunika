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
