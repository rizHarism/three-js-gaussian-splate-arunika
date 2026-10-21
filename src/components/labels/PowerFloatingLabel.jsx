/**
 * Creates the DOM element for Power Meter floating badge with Lucide Zap icon & futuristic HUD design.
 * Updates are done directly on span#power-watt-value for 60fps performance without re-render.
 */
export function createPowerFloatingLabelElement(initialWatts = 0) {
  const container = document.createElement("div");
  container.className = "floating-label-container power-label-anchor";

  // SVG Lucide Zap Icon
  const zapIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="label-icon-svg">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  `;

  container.innerHTML = `
    <div class="floating-label-card power-card">
      <div class="label-icon-wrapper power-icon-bg">
        ${zapIconSvg}
      </div>
      <div class="label-body">
        <span class="label-tag">METER LISTRIK</span>
        <div class="label-stat-row">
          <span id="power-watt-value" class="watt-glow-text">${initialWatts.toLocaleString()} W</span>
        </div>
      </div>
    </div>
    <div class="floating-pin-line"></div>
    <div class="floating-pin-dot power-dot"></div>
  `;

  return container;
}

export function updatePowerFloatingLabelValue(watts) {
  const el = document.getElementById("power-watt-value");
  if (el) {
    el.textContent = `${Number(watts).toLocaleString()} W`;
  }
}
