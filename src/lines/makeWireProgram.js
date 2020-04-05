import gl_utils from '../glUtils';
import createMultiKeyCache from './createMultiKeyCache';

let lineProgramCache = createMultiKeyCache();

export default function makeWireProgram(gl, wireCollection) {
  let allowColors = !!wireCollection.allowColors;
  let programKey = [allowColors, gl];
  let lineProgram = lineProgramCache.get(programKey)

  if (!lineProgram) {
    const { frag, vert } = getShadersCode(allowColors);
    var lineVSShader = gl_utils.compile(gl, gl.VERTEX_SHADER, vert);
    var lineFSShader = gl_utils.compile(gl, gl.FRAGMENT_SHADER, frag);
    lineProgram = gl_utils.link(gl, lineVSShader, lineFSShader);
    lineProgramCache.set(programKey, lineProgram);
  }

  let locations = gl_utils.getLocations(gl, lineProgram);

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
    lineProgramCache.remove(programKey);
  }

  function draw(drawContext) {
    if (wireCollection.count === 0) return;

    let data = wireCollection.buffer;

    gl.useProgram(lineProgram);

    gl.uniformMatrix4fv(locations.uniforms.uModel, false, wireCollection.worldModel);
    gl.uniformMatrix4fv(locations.uniforms.projectionMatrix, false, drawContext.projection);
    gl.uniformMatrix4fv(locations.uniforms.uView, false, drawContext.view.matrix);

    var color = wireCollection.color;
    gl.uniform4f(locations.uniforms.uColor, color.r, color.g, color.b, color.a);

    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    if (wireCollection.isDirtyBuffer) {
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      wireCollection.isDirtyBuffer = false;
    }

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
  return { 
    vert:   `attribute vec3 aPosition;
  varying vec4 vColor;
  ${allowColors ? 'attribute vec4 aColor;' : ''}
  uniform vec4 uColor;
  uniform mat4 projectionMatrix;
  uniform mat4 uModel;
  uniform mat4 uView;

void main() {
  gl_Position = projectionMatrix * uView * uModel * vec4(aPosition, 1.0);
  vColor = ${allowColors ? 'aColor.abgr' : 'uColor'};
}`,
    frag: `precision mediump float;
    varying vec4 vColor;
    void main() {
      gl_FragColor = vColor;
    }`
  };
}