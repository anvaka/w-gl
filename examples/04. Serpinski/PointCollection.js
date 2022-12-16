
window.PointCollection = createPointCollection();

function createPointCollection() {
let {GLCollection, defineProgram, ColorAttribute, InstancedAttribute} = window.wgl;
/**
 * Allows to render bunch of circular points, uses instancing.
 */
class PointCollection extends GLCollection {
  constructor(gl) {
    let program = defineProgram({
      gl,
      vertex: `
  uniform mat4 modelViewProjection;

  attribute float size;
  attribute vec3 position;
  attribute vec2 point;
  attribute vec4 color;

  varying vec4 vColor;
  varying vec2 vPoint;

  void main() {
    gl_Position = modelViewProjection * vec4(position + vec3(point * size, 0.), 1.0);
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
      },

      preDrawHook(/* programInfo */) {
        return `gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);`;
      },
      postDrawHook() {
        return 'gl.disable(gl.DEPTH_TEST);';
      },
    });

    super(program);
  }
}
return PointCollection;
}