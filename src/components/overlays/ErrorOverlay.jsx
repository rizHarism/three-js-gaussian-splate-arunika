import React from "react";

export default function ErrorOverlay({ error }) {
  if (!error) return null;

  return (
    <div id="error-overlay">
      <div className="error-card">
        <div className="error-icon">⚠️</div>
        <div className="error-title">Viewer Initialization Error</div>
        <div id="error-message">{error}</div>
        <button id="retry-btn" onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    </div>
  );
}
