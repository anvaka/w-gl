import {mat4} from 'gl-matrix';
/**
 * represents a single element in the scene tree
 */
class Element {
  constructor() {
    this.children = [];
    // Transforms local coordinate system to parent coordinate system
    this.model = mat4.create();
    // Cumulative transform to webgl coordinate system.
    this.worldModel = mat4.create();
    this.worldTransformNeedsUpdate = true;

    this.type = 'Element';
    this.scene = null;
  }

  appendChild(child, sendToBack) {
    child.parent = this;
    if (sendToBack) {
      // back of z-index
      this.children.unshift(child);
    } else {
      this.children.push(child);
    }
    if (child.bindScene) {
      child.bindScene(this.scene);
    }

    if (this.scene) this.scene.renderFrame();
  }

  bindScene(scene) {
    this.scene = scene;
  }

  traverse(enterCallback, exitCallback) {
    enterCallback(this);

    for (var i = 0; i < this.children.length; ++i) {
      var child = this.children[i];
      child.traverse(enterCallback, exitCallback);
    }

    if (exitCallback) exitCallback(this);
  }

  rotate(rad, axis) {
    mat4.rotate(this.model, this.model, rad, axis);
    this.worldTransformNeedsUpdate = true;
    return this;
  }

  rotateX(rad) {
    mat4.rotateX(this.model, this.model, rad);
    this.worldTransformNeedsUpdate = true;
    return this;
  }

  rotateY(rad) {
    mat4.rotateY(this.model, this.model, rad);
    this.worldTransformNeedsUpdate = true;
    return this;
  }

  rotateZ(rad) {
    mat4.rotateZ(this.model, this.model, rad);
    this.worldTransformNeedsUpdate = true;
    return this;
  }

  scale(v) {
    mat4.scale(this.model, this.model, v);
    this.worldTransformNeedsUpdate = true;
    return this;
  }

  translate(v) {
    mat4.translate(this.model, this.model, v);
    this.worldTransformNeedsUpdate = true;
    return this;
  }

  removeChild(child) {
    // TODO: should this be faster?
    let childIdx = this.children.indexOf(child);
    if (childIdx > -1) {
      this.children.splice(childIdx, 1);
    }

    if (this.scene) this.scene.renderFrame();
  }

  updateWorldTransform(force) {
    if (this.worldTransformNeedsUpdate || force) {
      if (this.parent) {
        mat4.multiply(this.worldModel, this.parent.worldModel, this.model);
      } else {
        mat4.copy(this.worldModel, this.model);
      }

      this.worldTransformNeedsUpdate = false;
      force = true; // We have to update children now.
    }

    let wasDirty = force;

    var children = this.children;
    for (var i = 0; i < children.length; i++ ) {
       wasDirty = children[i].updateWorldTransform(force) || wasDirty;
    }

    return wasDirty;
  }

  draw(gl, screen) {
    for (var i = 0; i < this.children.length; ++i) {
      var child = this.children[i];
      child.draw(gl, screen);
    }
  }

  dispose() {
    for (var i = 0; i < this.children.length; ++i) {
      var child = this.children[i];
      child.dispose();
    }
  }
}

export default Element;