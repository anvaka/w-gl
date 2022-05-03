import eventify from 'ngraph.events';
import DomContainer from './DomContainer';
import Element from '../Element';
import {WglScene} from '../createScene';
import epsilon from './epsilon';

export default class DomElement extends Element {
  el: HTMLElement;

  // Cached version of the CSS transform. The idea is that caching
  // improves performance. Need to validate this though.
  lastTransform: String;

  constructor(customStyle: CSSStyleDeclaration) {
    super();

    this.lastTransform = '';

    this.el = document.createElement('div');
    let style = this.el.style;
    style.position = 'absolute';
    style.pointerEvents = 'initial';
    // style.transformStyle = 'preserve-3d';
    // style.backfaceVisibility = 'hidden';
    if (customStyle) {
      let ourStyle = this.el.style;
      Object.keys(customStyle).forEach(key => {
        ourStyle[key] = customStyle[key];
      })
    }
    eventify(this);
  }

  updateWorldTransform(force?: boolean) {
    let updated = super.updateWorldTransform(force);
    if (updated) {
      (this as any).fire('update-transform', this);
    }
    return updated;
  }

  bindScene(scene: WglScene) {
    if (scene) {
      let domContainer = findDomContainer(this);
      if (!domContainer) {
        throw new Error('DomElement should be part of DomContainer hierarchy');
      }
      domContainer.acceptDomChild(this);
    } else if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
      (this as any).fire('disposed', this);
    }
    super.bindScene(scene);
  }

  draw(/* gl: WebGLRenderingContext */) {
    let thisTransform = getObjectCSSMatrix(this.worldModel as any as number[]);
    if (thisTransform !== this.lastTransform) {
      this.el.style.transform = thisTransform;
      this.lastTransform = thisTransform;
    }
  }

  dispose() {
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
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

function findDomContainer(startFrom: Element) {
  // Note: might be better to use duck typing instead.
  if (startFrom instanceof DomContainer) return startFrom;
  return startFrom.parent && findDomContainer(startFrom.parent);
}