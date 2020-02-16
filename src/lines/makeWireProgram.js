import gl_utils from '../glUtils';
import shaderGraph from '../shaderGraph/index.js';
import panzoomVS from '../shaderGraph/panzoom.js';

// TODO: this needs to be in a separate file, with proper resource management
let lineProgramCache = new Map(); // maps from GL context to program

const lineVSSrc = shaderGraph.getVSCode([
  panzoomVS
]);

const lineFSSrc = `
precision highp float;
uniform vec4 uColor;

void main() {
  gl_FragColor = uColor;
}
`;


export default function makeWireProgram(gl, wireCollection) {
  let lineProgram = lineProgramCache.get(gl)
  if (!lineProgram) {
    var lineVSShader = gl_utils.compile(gl, gl.VERTEX_SHADER, lineVSSrc);
    var lineFSShader = gl_utils.compile(gl, gl.FRAGMENT_SHADER, lineFSSrc);
    lineProgram = gl_utils.link(gl, lineVSShader, lineFSShader);
    lineProgramCache.set(gl, lineProgram);
  }
// .positions,  this.is3D

  var locations = gl_utils.getLocations(gl, lineProgram);

  var lineBuffer = gl.createBuffer();
  // var bpe = data.BYTES_PER_ELEMENT;

  // gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer)
  // gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.STATIC_DRAW);
  // gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);

  var api = {
    draw,
    dispose
  }

  return api;

  function dispose() {
    gl.deleteBuffer(lineBuffer);
    gl.deleteProgram(lineProgram);
    lineProgramCache.delete(gl);
  }

  function draw(drawContext) {
    if (wireCollection.count === 0) return;

    let size = wireCollection.is3D ? 3 : 2;
    let data = wireCollection.buffer;

    gl.useProgram(lineProgram);

    gl.uniformMatrix4fv(locations.uniforms.uModel, false, wireCollection.worldModel);
    gl.uniformMatrix4fv(locations.uniforms.uCamera, false, drawContext.camera);
    gl.uniformMatrix4fv(locations.uniforms.uView, false, drawContext.view);
    gl.uniform3fv(locations.uniforms.uOrigin, drawContext.origin);

    var color = wireCollection.color;
    gl.uniform4f(locations.uniforms.uColor, color.r, color.g, color.b, color.a);

    // TODO: Avoid buffering, if data hasn't changed?
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(locations.attributes.aPosition)
    gl.vertexAttribPointer(locations.attributes.aPosition, size, gl.FLOAT, false, 4 * size, 0)

    // gl.drawArrays(gl.LINES, 0, data.byteLength / 4 / wireCollection.itemsPerLine);
    gl.drawArrays(gl.LINES, 0, wireCollection.count * 2);
  }
}
