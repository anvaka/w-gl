import utils from '../glUtils';
import createMultiKeyCache from './createMultiKeyCache';

let lineProgramCache = createMultiKeyCache();

export default function makeLineStripProgram(gl, lineStripCollection) {
  let {allowColors, is3D} = lineStripCollection;
  allowColors = !!allowColors; // coerce to boolean.

  const programKey = [allowColors, gl];
  let lineProgram = lineProgramCache.get(programKey);
  const itemsPerVertex = 2 + (allowColors ? 1 : 0) + (is3D ? 1 : 0);

  let data = lineStripCollection.buffer;

  if (!lineProgram) {
    const { lineFSSrc, lineVSSrc } = getShadersCode(allowColors);
    var lineVSShader = utils.compile(gl, gl.VERTEX_SHADER, lineVSSrc);
    var lineFSShader = utils.compile(gl, gl.FRAGMENT_SHADER, lineFSSrc);
    lineProgram = utils.link(gl, lineVSShader, lineFSShader);
    lineProgramCache.set(programKey, lineProgram);
  }

  var locations = utils.getLocations(gl, lineProgram);
  let lineSize = is3D ? 3 : 2;
  let coloredLineStride = (lineSize + 1) * 4;
  let colorOffset = lineSize * 4;

  var lineBuffer = gl.createBuffer();

  var api = {
    draw,
    dispose
  };

  return api;

  function dispose() {
    gl.deleteBuffer(lineBuffer);
    gl.deleteProgram(lineProgram);
    lineProgramCache.remove(programKey);
  }

  function draw(lineStripCollection, drawContext) {
    // TODO: Why lineStripCollection passed second time?
    if (data.length === 0) return;

    gl.useProgram(lineProgram);

    gl.uniformMatrix4fv(locations.uniforms.uModel, false, lineStripCollection.worldModel);
    gl.uniformMatrix4fv(locations.uniforms.projectionMatrix, false, drawContext.projection);
    gl.uniformMatrix4fv(locations.uniforms.uView, false, drawContext.view.matrix);
    gl.uniform3fv(locations.uniforms.uOrigin, drawContext.view.position);

    let {color, nextElementIndex, madeFullCircle} = lineStripCollection;
    gl.uniform4f(locations.uniforms.uColor, color.r, color.g, color.b, color.a);

    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.enableVertexAttribArray(locations.attributes.aPosition);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
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
      gl.vertexAttribPointer(
        locations.attributes.aPosition,
        lineSize,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    if (madeFullCircle) {
      let elementsCount = data.byteLength / 4 / itemsPerVertex - nextElementIndex;
      gl.drawArrays(gl.LINE_STRIP, nextElementIndex, elementsCount);
      if (nextElementIndex > 1) gl.drawArrays(gl.LINE_STRIP, 0, nextElementIndex - 1);
    } else {
      gl.drawArrays(gl.LINE_STRIP, 1, nextElementIndex - 1);
    }
  }
}

function getShadersCode(allowColors) {
  const lineFSSrc = `precision mediump float;
varying vec4 vColor;
void main() {
  gl_FragColor = vColor;
}
`;
  const lineVSSrc = `attribute vec3 aPosition;
  varying vec4 vColor;
  ${allowColors ? 'attribute vec4 aColor;' : ''}
  uniform vec4 uColor;
  uniform mat4 projectionMatrix;
  uniform mat4 uModel;
  uniform mat4 uView;
  void main() {
    gl_Position = projectionMatrix * uView * uModel * vec4(aPosition, 1.0);
    vColor = ${allowColors ? 'aColor.abgr' : 'uColor'};
  }`;
  return { lineVSSrc, lineFSSrc };
}
