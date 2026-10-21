/**
 * Creates the DOM element for Power Meter floating badge.
 * Updates are done directly on span#power-watt-value for 60fps performance without re-render.
 */
export function createPowerFloatingLabelElement(initialWatts = 0) {
  const container = document.createElement("div");
  container.className = "floating-label-badge";
  container.innerHTML = `
    <span class="floating-label-pulse"></span>
    <span>Daya:</span>
    <span id="power-watt-value" style="color: #38bdf8; font-variant-numeric: tabular-nums;">${initialWatts}W</span>
  `;
  return container;
}

export function updatePowerFloatingLabelValue(watts) {
  const el = document.getElementById("power-watt-value");
  if (el) {
    el.textContent = `${watts}W`;
  }
}
