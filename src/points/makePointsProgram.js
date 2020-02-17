export default makePointsProgram;

import gl_utils from '../glUtils';
import shaderGraph from '../shaderGraph/index.js';
import panzoomVS from '../shaderGraph/panzoom';
import pointVS from '../shaderGraph/point';

const vertexShaderSrc = shaderGraph.getVSCode([
  panzoomVS,
  pointVS
]);

const fragmentShaderSrc = `
precision highp float;
varying vec4 vColor;
uniform sampler2D texture;

void main() {
  vec4 tColor = texture2D(texture, gl_PointCoord);
  gl_FragColor = vec4(vColor.rgb, tColor.a);
}
`;

let vertexProgramCache = new Map(); // maps from GL context to program

function makePointsProgram(gl, data) {
  let vertexProgram = vertexProgramCache.get(gl)
  if (!vertexProgram) {
    let vertexShader = gl_utils.compile(gl, gl.VERTEX_SHADER, vertexShaderSrc);
    let fragmentShader = gl_utils.compile(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
    vertexProgram = gl_utils.link(gl, vertexShader, fragmentShader);
    vertexProgramCache.set(gl, vertexProgram);
  }

  let locations = gl_utils.getLocations(gl, vertexProgram);

  var buffer = gl.createBuffer();
  if (!buffer) throw new Error('failed to create a nodesBuffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);

  var pointTexture = createCircleTexture(gl);

  var api = {
    draw,
    updateData,
    dispose
  };
  return api;

  function updateData(newData) {
    data = newData;
  }

  function dispose() {
    // For some reason disposing the buffer results in unbindable
    // buffer for the lines program (that is created after this scene is disposed).
    // gl.deleteBuffer(buffer);
    gl.deleteProgram(vertexProgram);
    gl.deleteTexture(pointTexture);
    vertexProgramCache.delete(gl);
  }

  function draw(pointCollection, drawContext) {
    gl.useProgram(vertexProgram);

    var bpe = data.BYTES_PER_ELEMENT;

    gl.uniformMatrix4fv(locations.uniforms.uModel, false, pointCollection.worldModel);
    gl.uniformMatrix4fv(locations.uniforms.uCamera, false, drawContext.camera);
    gl.uniformMatrix4fv(locations.uniforms.uView, false, drawContext.view);
    gl.uniform3fv(locations.uniforms.uOrigin, drawContext.origin);

    gl.bindTexture(gl.TEXTURE_2D, pointTexture);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    var positionSize = pointCollection.is3D ? 3 : 2;
    var itemsPerPoint = bpe * pointCollection.itemsPerPoint;
    gl.enableVertexAttribArray(locations.attributes.aPosition)
    gl.vertexAttribPointer(locations.attributes.aPosition, positionSize, gl.FLOAT, false, itemsPerPoint, 0)

    var offset = positionSize;
    gl.enableVertexAttribArray(locations.attributes.aPointSize)
    gl.vertexAttribPointer(locations.attributes.aPointSize, 1, gl.FLOAT, false, itemsPerPoint, offset * bpe)
    offset += 1;

    gl.enableVertexAttribArray(locations.attributes.aColor);
    gl.vertexAttribPointer(locations.attributes.aColor, 3, gl.FLOAT, false, itemsPerPoint, offset * bpe)
    gl.drawArrays(gl.POINTS, 0, pointCollection.count);
  }
}

function createCircleTexture(gl) {
  var pointTexture = gl.createTexture();
  if (!pointTexture) throw new Error('Failed to create circle texture');
  gl.bindTexture(gl.TEXTURE_2D, pointTexture);

  var size = 64
  var image = circle(size);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);

  return pointTexture;

  function circle(size) {
    var result = new Uint8Array(size * size * 4);
    var r = (size - 8)/2;
    for (var row = 0; row < size; ++row) {
      var offset = row * size;
      for (var col = 0; col < size; ++col) {
        var rgbaCoord = (offset + col) * 4;
        var cy = row - r;
        var cx = col - r;
        var distToCenter = Math.sqrt(cx * cx + cy * cy);
        if (distToCenter < r) {
          var ratio = (1 - distToCenter/r);
          result[rgbaCoord + 3] = ratio > 0.3 ? 0xff : 0xff * ratio;
        } else {
          result[rgbaCoord + 3] = 0x00;
        }
      }
    }
    return blur(result, size)
  }
}

function blur(src, size) {
  var result = new Uint8Array(size * size * 4);
  for (var row = 0; row < size; ++row) {
    for (var col = 0; col < size; ++col) {
      result[(row * size + col) * 4 + 3] = sample(row, col, 3, src, size);
    }
  }

  return result;

}
function sample(row, col, depth, src, size) {
  var avg = 0;
  var count = 0;
  for (var y = row - depth; y < row + depth; ++y) {
    if (y < 0 || y >= size) continue;
    for (var x = col - depth; x < col + depth; ++x) {
      if (x < 0 || x >= size) continue;

      avg += src[(y * size + x) * 4 + 3];
      count += 1;
    }
  }

  return avg/count;
}