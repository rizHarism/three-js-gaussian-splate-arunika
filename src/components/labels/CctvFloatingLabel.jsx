/**
 * Creates the DOM element for CCTV floating badge.
 * Dispatches onCctvClick callback when clicked.
 */
export function createCctvFloatingLabelElement(label = "CCTV Front", onClick) {
  const container = document.createElement("div");
  container.className = "floating-label-badge";
  container.style.borderColor = "rgba(129, 140, 248, 0.5)";
  container.innerHTML = `
    <span>📹</span>
    <span>${label}</span>
  `;
  if (onClick) {
    container.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
  }
  return container;
}
