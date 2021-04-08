import { DrawContext } from "src/createScene";
import epsilon from "./epsilon";

/**
 * Synchronizes CSS3 rendering with the parent drawing context.
 */
export default class DomCamera {
  /**
   * Container is where we place the CSS Camera. It preserves 3d transforms
   */
  container: HTMLElement;

  /**
   * Camera is the root element of the css rendering tree, and it follows
   * perspective camera of the parent w-gl scene.
   */
  camera: HTMLElement

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.style.overflow = 'hidden';

    this.camera = document.createElement('div');
    this.camera.style.transformStyle = 'preserve-3d';
    this.camera.style.pointerEvents = 'none';

    this.container.appendChild(this.camera);
    this.container.style.pointerEvents = 'none';
    parent.append(this.container);
  }

  render(drawContext: DrawContext) {
    // This is the same as 
    //   0.5 * drawContext.canvas.clientHeight  / Math.tan(drawContext.fov/2) 
    // and the idea behind this formula is to figure out how far from the plane is the camera
    let fov = drawContext.projection[5] * drawContext.height / (2 * drawContext.pixelRatio);
    let pixelRatioIndependentWidth = drawContext.width / drawContext.pixelRatio;
    let pixelRatioIndependentHeight = drawContext.height / drawContext.pixelRatio;
    let cameraCSSMatrix = 'translateZ(' + fov + 'px)' + getCameraCSSMatrix(drawContext.view.matrix);

    this.camera.style.transform = cameraCSSMatrix + 'translate(' + (pixelRatioIndependentWidth/2) + 'px,' + (pixelRatioIndependentHeight /2) + 'px)';
    this.camera.style.width = pixelRatioIndependentWidth + 'px';
    this.camera.style.height = pixelRatioIndependentHeight + 'px';

    this.container.style.width = pixelRatioIndependentWidth + 'px';
    this.container.style.height = pixelRatioIndependentHeight + 'px';
    this.container.style.perspective = fov + 'px';
  }
}

function getCameraCSSMatrix(elements: number[]) {
    return 'matrix3d(' +
      epsilon( elements[0]) + ',' +
      epsilon(-elements[1]) + ',' +
      epsilon( elements[2]) + ',' +
      epsilon( elements[3]) + ',' +
      epsilon( elements[4]) + ',' +
      epsilon(-elements[5]) + ',' +
      epsilon( elements[6]) + ',' +
      epsilon( elements[7]) + ',' +
      epsilon( elements[8]) + ',' +
      epsilon(-elements[9]) + ',' +
      epsilon( elements[10]) + ',' +
      epsilon( elements[11]) + ',' +
      epsilon( elements[12]) + ',' +
      epsilon(-elements[13]) + ',' +
      epsilon( elements[14]) + ',' +
      epsilon( elements[15]) +
    ')';
  }