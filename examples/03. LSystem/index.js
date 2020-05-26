const {createScene, WireCollection} = window.wgl;

let scene = createScene(document.querySelector('canvas'));
scene.setClearColor(12/255, 41/255, 82/255, 1)
let initialSceneSize = 400;
scene.setViewBox({
  left:  -initialSceneSize,
  top:   -initialSceneSize,
  right:  initialSceneSize,
  bottom: initialSceneSize,
});

class Turtle {
  constructor(scene, options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.z = options.z || 0;
    this.nx = options.nx || 1;
    this.ny = options.ny || 0;
    this.nz = options.nz || 0;
    this.lines = new WireCollection(1024, { width: options.width || 2 });
    this.scene = scene;
    this.stepSize = options.stepSize || 10;

    scene.appendChild(this.lines);
  }

  forward() {
    let x = this.x + this.stepSize * this.nx;
    let y = this.y + this.stepSize * this.ny;
    let z = this.z + this.stepSize * this.nz;

    this.lines.add({from: this, to: {x, y, z}});
    scene.renderFrame();

    this.x = x;
    this.y = y;
    this.z = z;
  }

  rotate(angleInDegrees) {
    let rad = Math.PI * angleInDegrees / 180

    let x = Math.cos(rad) * this.nx - Math.sin(rad) * this.ny;
    let y = Math.sin(rad) * this.nx + Math.cos(rad) * this.ny;

    let l = Math.hypot(x, y);
    this.nx = x / l;
    this.ny = y / l;
  }
}

let turtle = new Turtle(scene);

const rules = {
  'A': 'A-B--B+A++AA+B-',
  'B': '+A-BB--B-A++A+B',
  '-': 'rotate(-60)',
  '+': 'rotate(60)'
}
const start = 'A';

let operations = compileRules(rules, turtle);

function compileRules(rules, turtle) {
  let commands = {};

  Object.keys(rules).forEach(key => {
    let value = rules[key];
    let turtleAction = turtleCanDo(value, turtle);
    if (turtleAction) {
      commands[key] = turtleAction;
    } else {
      commands[key] = order => curve(order, value, turtle);
    }
  });

  return commands;
}

function turtleCanDo(command, turtle) {
  let rotate = command.match(/rotate\s*\((.+)\)/);
  if (!rotate) return;
  let angle = Number.parseFloat(rotate[1]);
  if (!Number.isFinite(angle)) return;

  return function*() { yield turtle.rotate(angle) };
}

function *curve(order, rule, turtle) {
  if (order === 0) {
      turtle.forward()
      return;
  }

  for (let op of rule) {
     yield* operations[op](order - 1)
  }
}

let order = 5;
let iterator = curve(order, start);

requestAnimationFrame(step);
function step() {
  let next, steps = 0;
  do {
    next = iterator.next();
  } while (!next.done && steps ++ < 100 );
  requestAnimationFrame(step);
}