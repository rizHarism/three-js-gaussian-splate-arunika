import React, { useState, useEffect, useCallback } from "react";
import Viewport3D from "./components/canvas/Viewport3D.jsx";
import TitleBadge from "./components/hud/TitleBadge.jsx";
import ControlsHint from "./components/hud/ControlsHint.jsx";
import LoadingOverlay from "./components/overlays/LoadingOverlay.jsx";
import ErrorOverlay from "./components/overlays/ErrorOverlay.jsx";
import Sidebar from "./components/dashboard/Sidebar.jsx";
import CctvDrawer from "./components/dashboard/CctvDrawer.jsx";
import { weatherService } from "./services/weatherService.js";
import { iotSimulationService } from "./services/iotSimulationService.js";
import { updatePowerFloatingLabelValue } from "./components/labels/PowerFloatingLabel.jsx";
import "./App.css";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing WebGPU renderer...");
  const [loadError, setLoadError] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [powerWatts, setPowerWatts] = useState(0);
  const [isCctvDrawerOpen, setIsCctvDrawerOpen] = useState(false);
  const [activeCctvName, setActiveCctvName] = useState("Front Office CCTV");

  // Start data services on mount
  useEffect(() => {
    weatherService.startPolling((data) => setWeatherData(data));

    iotSimulationService.start((watts) => {
      setPowerWatts(watts);
      updatePowerFloatingLabelValue(watts);
    });

    return () => {
      weatherService.stopPolling();
      iotSimulationService.stop();
    };
  }, []);

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

  const handleCctvClick = useCallback((cameraName) => {
    if (cameraName) {
      setActiveCctvName(cameraName);
    }
    setIsCctvDrawerOpen(true);
  }, []);

  return (
    <div className="app-container">
      <Viewport3D
        weatherData={weatherData}
        onLoadProgress={handleProgress}
        onLoadComplete={handleComplete}
        onLoadError={handleError}
        onCctvClick={handleCctvClick}
      />

      <div id="hud">
        <TitleBadge />
        <ControlsHint />
      </div>

      <CctvDrawer
        isOpen={isCctvDrawerOpen}
        onClose={() => setIsCctvDrawerOpen(false)}
        cctvName={activeCctvName}
      />

      <Sidebar weatherData={weatherData} powerWatts={powerWatts} />

      <LoadingOverlay
        isLoading={isLoading}
        progress={loadingProgress}
        statusText={statusText}
      />

      <ErrorOverlay error={loadError} />
    </div>
  );
}
