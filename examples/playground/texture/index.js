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

let scene = createScene(document.querySelector('canvas'), { });
let renderProgram = defineProgram({
  gl: scene.getGL(),
  vertex: `
  uniform mat4 modelViewProjection;
  uniform sampler2D texture;

  attribute vec3 position;
  varying vec2 vPoint;

  void main() {
    gl_Position = modelViewProjection * vec4(position, 1.0);
    vPoint = position.xy + 0.5;
  }`,

  fragment: `
  precision highp float;

  uniform sampler2D texture;
  varying vec2 vPoint;

  void main() {
    gl_FragColor = texture2D(texture, vPoint);
  }`,
});

let quad = new Quad(scene.getGL(), renderProgram);

loadImageToCanvas('https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/11_Temple_of_Heaven.jpg/2880px-11_Temple_of_Heaven.jpg').then(canvas => {
  renderProgram.setTextureCanvas('texture', canvas);
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
