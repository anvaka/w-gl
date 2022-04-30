const {createScene, Element, defineProgram} = window.wgl;

/**
 * This is a regular quad
 */
class Quad extends Element {
  constructor(gl, program) {
    super();

    this.gl = gl;
    this.program = program;

    // corners of two triangles
    program.add({position: [-0.5, -0.5, 0]});
    program.add({position: [-0.5,  0.5, 0]});
    program.add({position: [ 0.5, -0.5, 0]});

    program.add({position: [ 0.5, -0.5, 0]});
    program.add({position: [-0.5,  0.5, 0]});
    program.add({position: [ 0.5,  0.5, 0]});
  }

  draw(gl, drawContext) {
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
}

// We use webgl2 for this example, but you can use webgl1 as well.
let scene = createScene(document.querySelector('canvas'), { version: 2 });
let renderProgram = defineProgram({
  gl: scene.getGL(),
  vertex: `#version 300 es
  uniform mat4 modelViewProjection;
  uniform sampler2D img;

  in vec3 position;
  out vec2 vPoint;

  void main() {
    gl_Position = modelViewProjection * vec4(position, 1.0);
    vPoint = position.xy + 0.5;
  }`,

  fragment: `#version 300 es
  precision highp float;

  uniform sampler2D img;
  in vec2 vPoint;
  out vec4 outColor;

  void main() {
    outColor = texture(img, vPoint);
  }`,
});

let quad = new Quad(scene.getGL(), renderProgram);

loadImageToCanvas('https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/11_Temple_of_Heaven.jpg/2880px-11_Temple_of_Heaven.jpg').then(canvas => {
  renderProgram.setTextureCanvas('img', canvas);
  scene.appendChild(quad);
  scene.renderFrame(/* immediate = */ true);
});

function loadImageToCanvas(url) {
  return new Promise(resolve => {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    let img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.src = url;
  });
}
