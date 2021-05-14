import {vec3} from 'gl-matrix';
import defineProgram from "src/gl/defineProgram";
import GLCollection from "src/GLCollection/GLCollection";
import DomElement from "./DomElement";

type QuadPointTracker = {
  original: number[],
  point: number[],
  uiId: number
};

export class SeeThroughCollection extends GLCollection {
  domElementToPoints: Map<DomElement, QuadPointTracker[]>;
  uiIDToUI: Map<number, QuadPointTracker>;

  constructor(gl: WebGLRenderingContext) {
    let program = defineProgram({
      gl,
      vertex: `
  uniform mat4 modelViewProjection;
  attribute vec3 point;

  void main() {
    gl_Position = modelViewProjection * vec4(point, 1.0);
  }`,

      fragment: `
      precision highp float;
      void main() {
        gl_FragColor = vec4(0., 0., 0., 0.);
      }`,
        preDrawHook(/* programInfo */) {
          return `gl.disable(gl.BLEND);
          gl.enable(gl.DEPTH_TEST);
          gl.depthFunc(gl.LEQUAL);`;
        },
        postDrawHook() {
          return 'gl.enable(gl.BLEND); gl.disable(gl.DEPTH_TEST);';
        },
    });
    super(program);

    this.domElementToPoints = new Map();
    this.uiIDToUI = new Map();
  }

  appendFromDomElement(dom: DomElement) {
    // TODO: This might be a bit fragile!
    let width = Number.parseFloat(dom.el.style.width);
    let height = Number.parseFloat(dom.el.style.height);

    let quadPoints = [
      [-width/2, -height/2, 0],
      [width/2, -height/2, 0],
      [width/2, height/2, 0],

      [width/2, height/2, 0],
      [-width/2, height/2, 0],
      [-width/2, -height/2, 0],
    ];

    // We update the world transform here once. We should be doing this
    // every time when DomElement's transforms are changed!
    dom.updateWorldTransform();

    const quadPointTrackers = quadPoints.map(original => {
      const point = vec3.transformMat4([], original, dom.worldModel);
      let ui = {
        original,
        point,
        uiId: -1
      };
      ui.uiId = this.add(ui);
      this.uiIDToUI.set(ui.uiId, ui);
      return ui;
    });

    this.domElementToPoints.set(dom, quadPointTrackers);
    (dom as any).on('update-transform', this.updateDOMElementTransform, this);
    (dom as any).on('disposed', this.disposeDomElement, this);
  }

  disposeDomElement(domElement: DomElement) {
    let quadTracker = this.domElementToPoints.get(domElement);
    if (!quadTracker) throw new Error('Unknown dom element requested to be disposed');

    quadTracker.forEach(tracker => {
      let oldUI = tracker.uiId;
      let newUI = this.remove(oldUI);
      let movedUI = this.uiIDToUI.get(newUI);
      if (!movedUI) {
        throw new Error('Cannot find moved vertex ui');
      }
      this.uiIDToUI.delete(newUI);
      if (newUI !== oldUI) {
        // the vertex now lives on this location:
        movedUI.uiId = oldUI;
        this.uiIDToUI.set(oldUI, movedUI);
      }
    });

    // Clean up
    (domElement as any).off('update-transform', this.updateDOMElementTransform);
    (domElement as any).off('disposed', this.disposeDomElement);
    this.domElementToPoints.delete(domElement);
  }

  updateDOMElementTransform(domElement: DomElement) {
    let quadTracker = this.domElementToPoints.get(domElement);
    if (!quadTracker) throw new Error('Unknown dom element requested transform update');
    quadTracker.forEach(tracker => {
      vec3.transformMat4(tracker.point, tracker.original, domElement.worldModel);
      this.update(tracker.uiId, tracker);
    });
  }

  // draw(gl, drawContext: DrawContext) {
  //   if (!this.uniforms) {
  //     this.uniforms = {
  //       modelViewProjection: this.modelViewProjection,
  //     }
  //   }

  //   this.program.draw(this.uniforms);
  // }

  clear() {
    this.program.setCount(0);
  }
}
