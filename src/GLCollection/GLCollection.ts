import Element from '../Element';
import {RenderProgram} from 'src/gl/defineProgram';
import { DrawContext } from 'src/createScene';

export default class GLCollection extends Element {
  uniforms?: Object;
  program: RenderProgram;

  constructor(program: RenderProgram) {
    super();
    this.program = program;
    this.uniforms = undefined;
  }

  getBuffer() {
    return this.program.getBuffer();
  }

  appendBuffer(uint8Collection: Uint8Array, offset: number) {
    this.program.appendBuffer(uint8Collection, offset);
    if (this.scene) this.scene.renderFrame();
  }

  add(vertex: Object) {
    return this.program.add(vertex);
  }

  update(id: number, point: Object) {
    this.program.update(id, point);
  }

  remove(id: number) {
    return this.program.remove(id);
  }

  get(id: number) {
    return this.program.get(id);
  }

  draw(gl: WebGLRenderingContext, drawContext: DrawContext) {
    if (!this.uniforms) {
      this.uniforms = {
        projectionMatrix: drawContext.projection,
        model: this.worldModel,
        view: drawContext.view.matrix,
        modelViewProjection: this.modelViewProjection
      };
    }
    this.program.draw(this.uniforms);
  }

  dispose() {
    super.dispose();
    if (this.program) {
      this.program.dispose();
      // this.program = null; Should I do this?
    }
  }
}
