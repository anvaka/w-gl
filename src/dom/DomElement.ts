import DomCamera from "./DomCamera";
import Element from "../Element";
import {WglScene, DrawContext} from '../createScene';
import epsilon from "./epsilon";

export default class DomElement extends Element {
  el: HTMLElement;

  constructor(customStyle: CSSStyleDeclaration) {
    super();

    this.el = document.createElement('div');
    this.el.style.pointerEvents = 'initial';
    if (customStyle) {
      let ourStyle = this.el.style;
      Object.keys(customStyle).forEach(key => {
        ourStyle[key] = customStyle[key];
      })
    }
  }

  bindScene(scene: WglScene) {
    let dc = scene.getDrawContext();
    if (!dc.domCamera) {
      if (!dc.canvas.parentElement) {
        throw new Error('Scene does not have a parent element');
      }
      dc.domCamera = new DomCamera(dc.canvas.parentElement);
    }
    dc.domCamera.camera.appendChild(this.el);
    super.bindScene(scene);
  }

  draw(gl: WebGLRenderingContext, drawContext: DrawContext) {
    if (!drawContext.domCamera) return;
    drawContext.domCamera.render(drawContext)

    this.el.style.transform = getObjectCSSMatrix(this.worldModel);
  }
}

function getObjectCSSMatrix(elements: number[]) {
  let matrix3d = 'matrix3d(' +
      epsilon(elements[0]) + ',' +
      epsilon(elements[1]) + ',' +
      epsilon(elements[2]) + ',' +
      epsilon(elements[3]) + ',' +
      epsilon(-elements[4]) + ',' +
      epsilon(-elements[5]) + ',' +
      epsilon(-elements[6]) + ',' +
      epsilon(-elements[7]) + ',' +
      epsilon(elements[8]) + ',' +
      epsilon(elements[9]) + ',' +
      epsilon(elements[10]) + ',' +
      epsilon(elements[11]) + ',' +
      epsilon(elements[12]) + ',' +
      epsilon(elements[13]) + ',' +
      epsilon(elements[14]) + ',' +
      epsilon(elements[15]) + ')';

    return 'translate(-50%,-50%)' + matrix3d;
}