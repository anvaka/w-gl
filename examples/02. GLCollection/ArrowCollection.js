// Normally you wouldn't do this, use the bundler. Here we just call a function to construct our class
// and plop it to the global `window`
window.ArrowCollection = createArrowCollection();

function createArrowCollection() {
let {GLCollection, defineProgram, InstancedAttribute} = window.wgl;
// Note: the shader has a bug with z coordinate of the arrow. I'm still keeping it and maybe will get back
// to it later
  class ArrowCollection extends GLCollection {
    constructor(gl) {
      let program = defineProgram({
        gl,
        vertex: `
    uniform mat4 modelViewProjection;
    uniform vec4 color;
    uniform float width;

    attribute vec3 from, to;
    attribute vec2 point;

    varying vec4 vColor;
    varying vec2 vPoint;

    void main() {
      vec2 xBasis = normalize(to - from).xy;
      vec2 yBasis = vec2(-xBasis.y, xBasis.x);

      vec4 clip0 = modelViewProjection * vec4(
        from.xy + width * yBasis * point.x, from.z, 1.0
      );
      vec4 clip1 = modelViewProjection * vec4(
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
        vertex: `
    uniform mat4 modelViewProjection;
    uniform vec4 color;
    uniform float width;

    attribute vec3 from, to;
    attribute vec2 point;

    varying vec4 vColor;
    varying vec2 vPoint;

    void main() {
      vec2 xBasis = normalize(to.xy - from.xy);
      vec2 yBasis = vec2(-xBasis.y, xBasis.x);

      vec4 clip0 = modelViewProjection * vec4(
        to.xy + 4.* width * yBasis * point.x - 8.* width *length(xBasis) * xBasis, 
        (to - 8.* width *length(to - from) * normalize(to - from)).z,
        1.0
      );
      vec4 clip1 = modelViewProjection * vec4(to, 1.0);

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
      if (!this.uniforms) {
        this.uniforms = {
          modelViewProjection: this.modelViewProjection,
          color: [1, 1, 1, 0.7],
          width: 0.01,
        }
      }
      this.program.draw(this.uniforms);
      this.arrowProgram.draw(this.uniforms);
    }
    add(item) {
      this.program.add(item);
      this.arrowProgram.add(item);
    }
  }
  return ArrowCollection;
}
