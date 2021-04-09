import { DrawContext, WglScene } from "src/createScene";
import Element from "src/Element";
import epsilon from "./epsilon";

type DomContainerOptions = {
  /**
   * If set to true the Dom container is rendered behind the canvas. This
   * allows to render webgl items in front of the DOM items.
   * 
   * Potentially this also leads to higher calculation demands.
   */
  seeThrough: boolean
}
/**
 * Synchronizes CSS3 rendering with the parent drawing context.
 */
export default class DomContainer extends Element {
  /**
   * Container is where we place the CSS Camera. It preserves 3d transforms
   */
  container: HTMLElement;

  /**
   * Camera is the root element of the css rendering tree, and it follows
   * perspective camera of the parent w-gl scene.
   */
  camera: HTMLElement;

  bound: boolean;
  seeThrough: boolean;

  constructor(options?: DomContainerOptions) {
    super();
    this.container = document.createElement('div');
    this.container.style.overflow = 'hidden';

    this.camera = document.createElement('div');
    this.camera.style.transformStyle = 'preserve-3d';
    this.camera.style.pointerEvents = 'none';
    this.camera.style.position = 'relative';

    this.container.appendChild(this.camera);
    this.container.style.pointerEvents = 'none';
    this.bound = false;

    this.seeThrough = (options && (typeof options.seeThrough !== 'undefined')) ?
      options.seeThrough : false;
  }

  bindScene(scene: WglScene) {
    if (scene) {
      let dc = scene.getDrawContext();
      let parent = dc.canvas.parentElement;
      if (!parent) {
          throw new Error('Scene does not have a parent element');
      }
      if (this.seeThrough) parent.insertBefore(this.container, dc.canvas);
      else parent.append(this.container);

      this.bound = true;
    } else {
      if (this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
      }
      this.bound = false;
    }
    super.bindScene(scene);
  }

  acceptDomChild(child: HTMLElement) {
    this.camera.appendChild(child);
  }

  draw(gl: WebGLRenderingContext, drawContext: DrawContext) {
    if (!this.bound) return;
    this._updateCameraTransforms(drawContext);

    super.draw(gl, drawContext);
  }

  _updateCameraTransforms(drawContext: DrawContext) {
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