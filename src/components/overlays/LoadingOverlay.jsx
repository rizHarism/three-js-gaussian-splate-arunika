import React from "react";

export default function LoadingOverlay({ isLoading, progress, statusText }) {
  if (!isLoading) return null;

  return (
    <div id="loading-overlay">
      <div className="loading-card futuristic-loader">
        {/* Ambient Radial Glow */}
        <div className="loader-ambient-glow" />

        {/* Dual Rotating Cyber Gyro Rings */}
        <div className="cyber-gyro-container">
          <div className="gyro-ring ring-outer" />
          <div className="gyro-ring ring-inner" />
          <div className="gyro-core-brand">
            <span className="brand-logo-symbol">❖</span>
          </div>
        </div>

        {/* Brand & Subtitle */}
        <div className="loading-title">Arunika Office</div>
        <div className="loading-subtitle">Digital Twin Fasad — Three.js WebGPU</div>

        {/* Large Glowing Percentage */}
        <div className="loading-percent-display">
          <span className="percent-num">{progress}</span>
          <span className="percent-unit">%</span>
        </div>

        {/* Shimmer Progress Track */}
        <div className="progress-track shimmer-track">
          <div id="progress-bar" style={{ width: `${progress}%` }}>
            <div className="progress-shimmer-wave" />
          </div>
        </div>

        {/* Current Pipeline Status */}
        <div id="status-text">{statusText}</div>

        {/* 3-Stage Pipeline Stepper */}
        <div className="loading-pipeline-steps">
          <div className={`step-item ${progress >= 10 ? "active" : ""}`}>
            <span className="step-dot" /> WebGPU Engine
          </div>
          <div className={`step-item ${progress >= 40 ? "active" : ""}`}>
            <span className="step-dot" /> SPZ Geometry
          </div>
          <div className={`step-item ${progress >= 95 ? "active" : ""}`}>
            <span className="step-dot" /> Scene Ready
          </div>
        </div>
      </div>
    </div>
  );
}
