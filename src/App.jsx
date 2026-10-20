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
