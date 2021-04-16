import { DrawContext, WglScene } from "./createScene"

export default class TransformEvent {
  drawContext: DrawContext;
  updated: boolean;

  constructor(scene: WglScene) {
    this.drawContext = scene.getDrawContext();
    this.updated = false;
  }
}