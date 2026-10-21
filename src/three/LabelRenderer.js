import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

export class LabelRenderer {
  constructor(containerElement) {
    this.container = containerElement;
    this.renderer = new CSS2DRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.top = "0px";
    this.renderer.domElement.style.left = "0px";
    this.renderer.domElement.style.pointerEvents = "none";
    this.renderer.domElement.className = "css2d-layer";

    this.container.appendChild(this.renderer.domElement);
    this.labels = new Map();
  }

  addLabel(id, domElement, position, scene) {
    domElement.style.pointerEvents = "auto";
    const cssObject = new CSS2DObject(domElement);
    cssObject.position.set(position.x, position.y, position.z);
    scene.add(cssObject);
    this.labels.set(id, cssObject);
    return cssObject;
  }

  removeLabel(id, scene) {
    const cssObject = this.labels.get(id);
    if (cssObject && scene) {
      scene.remove(cssObject);
      this.labels.delete(id);
    }
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  dispose() {
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.labels.clear();
  }
}
