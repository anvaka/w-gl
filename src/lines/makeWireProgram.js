import gl_utils from '../glUtils';
import shaderGraph from '../shaderGraph/index.js';
import panzoomVS from '../shaderGraph/panzoom.js';

// TODO: this needs to be in a separate file, with proper resource management
let lineProgramCache = new Map(); // maps from GL context to program


export default function makeWireProgram(gl, wireCollection) {
  // TODO: this cache key is invalid for different settings of the is3D/allowColors
  let lineProgram = lineProgramCache.get(gl)
  if (!lineProgram) {
    const { lineFSSrc, lineVSSrc } = getShadersCode(wireCollection.allowColors);
    var lineVSShader = gl_utils.compile(gl, gl.VERTEX_SHADER, lineVSSrc);
    var lineFSShader = gl_utils.compile(gl, gl.FRAGMENT_SHADER, lineFSSrc);
    lineProgram = gl_utils.link(gl, lineVSShader, lineFSShader);
    lineProgramCache.set(gl, lineProgram);
  }

  let locations = gl_utils.getLocations(gl, lineProgram);
  let allowColors = wireCollection.allowColors;

  let lineBuffer = gl.createBuffer();
  let lineSize = wireCollection.is3D ? 3 : 2;
  let coloredLineStride = (lineSize + 1) * 4;
  let colorOffset = lineSize * 4;

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
    if (allowColors) {
      gl.vertexAttribPointer(
        locations.attributes.aPosition,
        lineSize,
        gl.FLOAT,
        false,
        coloredLineStride,
        0
      );

      gl.enableVertexAttribArray(locations.attributes.aColor);
      gl.vertexAttribPointer(
        locations.attributes.aColor,
        4,
        gl.UNSIGNED_BYTE,
        true,
        coloredLineStride,
        colorOffset
      );
    } else {
      gl.vertexAttribPointer(locations.attributes.aPosition, lineSize, gl.FLOAT, false, 4 * lineSize, 0)
    }

    gl.drawArrays(gl.LINES, 0, wireCollection.count * 2);
  }
}

function getShadersCode(allowColors) {
  const lineFSSrc = `precision mediump float;
varying vec4 vColor;
void main() {
  gl_FragColor = vColor;
}
`;
  const lineVSSrc = shaderGraph.getVSCode([
    {
      globals() {
        return `
  attribute vec3 aPosition;
  varying vec4 vColor;
  ${allowColors ? 'attribute vec4 aColor;' : ''}
  uniform vec4 uColor;
  uniform mat4 uCamera;
  uniform mat4 uModel;
  uniform mat4 uView;
`;
      },
      mainBody() {
        return `
  gl_Position = uCamera * uView * uModel * vec4(aPosition, 1.0);
  vColor = ${allowColors ? 'aColor.abgr' : 'uColor'};
`;
      }
    }
  ]);
  return { lineVSSrc, lineFSSrc };
}