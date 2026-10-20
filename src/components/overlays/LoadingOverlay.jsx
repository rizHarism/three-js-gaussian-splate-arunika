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
