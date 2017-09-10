var Element = require('../src/Element');
var createTree = require('d3-quadtree').quadtree;

/**
 * Add this element to your scene to get `point-enter`, `point-leave`,
 * `point-click` events from PointCollection elements.
 * 
 * Note: current implementation is suboptimal and used for debugging
 * only. More work needs to be done before I can recommend it to anyone.
 * (see TODOs in the file)
 */
class ActivePoints extends Element {
  constructor(scene) {
    super();

    this.scene = scene;
    this.prevHighlighted = null;
    this.lastTreeUpdate = new Date();

    // TODO: when removed from scene we need to release these events
    scene.on('mousemove', this.onMouseMove, this);
    scene.on('click', this.onClick, this);
  }

  findUnderCursor(x, y) {
    if (!this.interactiveTree) return;

    return this.interactiveTree.find(x, y, 10);
  }

  draw(gl, drawContext) {
    if (drawContext.wasDirty) {
      this.updateInteractiveTree();
    }
  }

  updateInteractiveTree() {
    var now = new Date();
    if (now - this.lastTreeUpdate < 500) return; 

    // TODO: This is such a waste of time! Instead of rebuilding tree on each
    // transform modification you should build tree once for each point collection
    // in global coordinates, and apply transform to lookup point.
    var interactiveTree = createTree().x(p => p.x).y(p => p.y);
    var transform = this.scene.getTransform();
    var sceneRoot = this.scene.getRoot();
    var dx = -transform.dx;
    var dy = -transform.dy
    sceneRoot.traverse(child => {
      dx += child.transform.dx;
      dy += child.transform.dy;
      if (child.type === 'PointCollection') {
        var points = child.pointsAccessor.map(p => ({
          x: p.x + dx,
          y: p.y + dy,
          p: p
        }))
        interactiveTree.addAll(points);
      }
    }, child => {
      dx -= child.transform.dx;
      dy -= child.transform.dy;
    })

    this.interactiveTree = interactiveTree;

    this.lastTreeUpdate = new Date();
  }

  onMouseMove(event) {
    var e = event.originalEvent;

    var res = this.findUnderCursor(event.sceneX, event.sceneY);
    if (!res) {
      if (this.prevHighlighted) {
        this.scene.fire('point-leave', this.prevHighlighted);
        this.prevHighlighted = null;
      }
  
      return;
    }

    if (res === this.prevHighlighted) return;

    this.prevHighlighted = res;
    this.scene.fire('point-enter', this.prevHighlighted, {
      x: e.clientX,
      y: e.clientY
    });
  }

  onClick(event) {
    var e = event.originalEvent;
    var res = this.findUnderCursor(event.sceneX, event.sceneY);
    if (res) {
      this.scene.fire('point-click', res, {
        x: e.clientX,
        y: e.clientY
      });
    }
  }
}

module.exports = ActivePoints;