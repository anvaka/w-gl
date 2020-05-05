/* eslint-disable no-undef */
/**
 * Please ignore this. I'm still learning stuff.
 */
const {createScene,  createGuide} = window.wgl;

class PointCollection extends GLInstancedCollection {
  constructor(gl) {
    let program = defineProgram({
      gl,
      preDrawHook(/* programInfo */) {
        return `gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);`;
      },
      postDrawHook() {
        return 'gl.disable(gl.DEPTH_TEST);';
      },

      vertex: `
  uniform mat4 projectionMatrix;
  uniform mat4 model;
  uniform mat4 view;

  attribute float size;
  attribute vec3 position;
  attribute vec2 point;
  attribute vec4 color;

  varying vec4 vColor;
  varying vec2 vPoint;

  void main() {
    gl_Position = projectionMatrix * view * model * vec4(position + vec3(point * size, 0.), 1.0);
    vColor = color.abgr;
    vPoint = point;
  }`,

      fragment: `
  precision highp float;
  varying vec4 vColor;
  varying vec2 vPoint;

  void main() {
    float dist = length(vPoint);
    if (dist >= 0.5) {discard;}

    gl_FragColor = vColor;
  }`,
      // These are just overrides:
      attributes: {
        color: new ColorAttribute(),
      },
      instanced: {
        point: new InstancedAttribute([
          -0.5, -0.5, -0.5,  0.5, 0.5,  0.5,
          0.5,  0.5, 0.5, -0.5, -0.5, -0.5,
        ])
      }
    })
    super(program);
  }
}

class ArrowCollection extends GLInstancedCollection {
  constructor(gl) {

    let program = defineProgram({
      gl,
      vertex: `
  uniform mat4 projectionMatrix;
  uniform mat4 model;
  uniform mat4 view;
  uniform vec4 color;
  uniform float width;

  attribute vec3 from, to;
  attribute vec2 point;

  varying vec4 vColor;
  varying vec2 vPoint;

  void main() {
    vec2 xBasis = normalize(to - from).xy;
    vec2 yBasis = vec2(-xBasis.y, xBasis.x);

    vec4 clip0 = projectionMatrix * view * model * vec4(
      from.xy + width * yBasis * point.x, from.z, 1.0
    );
    vec4 clip1 = projectionMatrix * view * model * vec4(
      to.xy + width * yBasis * point.x - 8.* width * xBasis * length(to - from),
      (to - 8.* width *length(to - from) * normalize(to - from)).z,
      1.0
    );

    gl_Position = mix(clip0, clip1, point.y);
    vColor = color;
  }`,

      fragment: `
  precision highp float;
  varying vec4 vColor;

  void main() {
    gl_FragColor = vColor;
  }`,
      instanced: {
        point: new InstancedAttribute([
          -0.5, 0, -0.5, 1, 0.5, 1, // First 2D triangle of the quad
          -0.5, 0, 0.5, 1, 0.5, 0   // Second 2D triangle of the quad
        ])
      }
    });
    super(program);



    this.arrowProgram = defineProgram({
      gl,
      debug: true,
      vertex: `
  uniform mat4 projectionMatrix;
  uniform mat4 model;
  uniform mat4 view;
  uniform vec4 color;
  uniform float width;

  attribute vec3 from, to;
  attribute vec2 point;

  varying vec4 vColor;
  varying vec2 vPoint;

  void main() {
    vec2 xBasis = normalize(to.xy - from.xy);
    vec2 yBasis = vec2(-xBasis.y, xBasis.x);

    vec4 clip0 = projectionMatrix * view * model * vec4(
      to.xy + 4.* width * yBasis * point.x - 8.* width *length(xBasis) * xBasis, 
      (to - 8.* width *length(to - from) * normalize(to - from)).z,
      1.0
    );
    vec4 clip1 = projectionMatrix * view * model * vec4(to, 1.0);

    gl_Position = mix(clip0, clip1, point.y);
    vColor = color;
  }`,

      fragment: `
  precision highp float;
  varying vec4 vColor;

  void main() {
    gl_FragColor = vColor;
  }`,
      instanced: {
        point: new InstancedAttribute([
          -0.5, 0, 0, 1, 0, 0,
          0, 0, 0.5, 0, 1, 1
        ])
      }
    });
  }

  draw(gl, drawContext) {
    const uniforms = {
      projectionMatrix: drawContext.projection,
      model: this.worldModel,
      view: drawContext.view.matrix,
      color: [1, 1, 1, 0.7],
      //resolution: [drawContext.width, drawContext.height],
      width: 0.01,
    }
    this.program.draw(uniforms);
    this.arrowProgram.draw(uniforms);
  }
  add(item) {
    this.program.add(item);
    this.arrowProgram.add(item);
  }
}

function field(origin) {
  let l = Math.hypot(origin[0], origin[1], origin[2]);
  return [
    Math.cos(origin[0]),
    Math.sin(origin[1]),
    Math.tan(l/20),
  ]
}

let scene = createScene(document.querySelector('canvas'), { });
createGuide(scene, {showGrid: true});
let lineCollection = new ArrowCollection(scene.getGL());
// lineCollection.add({
//   from: [0, 0, 0],
//   to: [0, 0.1, 100],
// })
for (let x = -100; x < 100; x+= 0.5) {
  for (let y = -100; y < 100; y+= 0.5) {
    for (let z = 0; z < 1; z+= 1) {
      let origin = [x, y, z * 10];
      let dest = field(origin);
      let l = Math.hypot(dest[0], dest[1], dest[2]);
      lineCollection.add({
        from: origin,
        to: [
          origin[0] + dest[0]/l,
          origin[1] + dest[1]/l,
          origin[2] + dest[2]/l,
        ]
      })
    }
  }
}

// let pointCollection = new PointCollection(scene.getGL());
// pointCollection.add({
//   position: [0, 0, 0],
//   size: 0.5,
//   color: 0x11ffffff
// });
// pointCollection.rotate(Math.PI/4, [1, 0, 0])
// function toHex(r, g, b) {
//   r = Math.round(r);
//   g = Math.round(g);
//   b = Math.round(b);
//   return (r << 24) | (g << 16) | (b << 8) | 0xff
// }

scene.appendChild(lineCollection)
