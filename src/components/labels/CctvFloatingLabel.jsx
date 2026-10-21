/**
 * Creates the DOM element for CCTV floating badge with Lucide Video icon, Live badge, and radar ping.
 * Dispatches onClick callback when clicked.
 */
export function createCctvFloatingLabelElement(label = "CCTV Front", onClick) {
  const container = document.createElement("div");
  container.className = "floating-label-container cctv-label-anchor";

  // SVG Lucide Video Icon
  const videoIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="label-icon-svg">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </svg>
  `;

  container.innerHTML = `
    <div class="floating-label-card cctv-card" role="button" title="Klik untuk memantau stream CCTV">
      <div class="label-icon-wrapper cctv-icon-bg">
        ${videoIconSvg}
      </div>
      <div class="label-body">
        <div class="cctv-header-row">
          <span class="label-tag">SURVEILLANCE</span>
          <span class="cctv-live-badge"><span class="cctv-rec-dot"></span>LIVE</span>
        </div>
        <span class="cctv-name-text">${label}</span>
      </div>
    </div>
    <div class="floating-pin-line"></div>
    <div class="floating-pin-dot cctv-dot">
      <div class="pin-radar-ring"></div>
    </div>
  `;

  if (onClick) {
    const card = container.querySelector(".floating-label-card");
    if (card) {
      card.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
      });
    }
  }

  return container;
}
