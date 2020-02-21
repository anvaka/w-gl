export default makePointsProgram;

import gl_utils from '../glUtils';
import shaderGraph from '../shaderGraph/index.js';
import createMultiKeyCache from '../lines/createMultiKeyCache';

let vertexProgramCache = createMultiKeyCache();

function makePointsProgram(gl, pointCollection) {
  let allowColors = !!pointCollection.allowColors;
  let programKey = [allowColors, gl];

  let vertexProgram = vertexProgramCache.get(programKey)
  if (!vertexProgram) {
    const { fragmentShaderCode, vertexShaderCode } = getShadersCode(allowColors);
    let vertexShader = gl_utils.compile(gl, gl.VERTEX_SHADER, vertexShaderCode);
    let fragmentShader = gl_utils.compile(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

    vertexProgram = gl_utils.link(gl, vertexShader, fragmentShader);
    vertexProgramCache.set(programKey, vertexProgram);
  }

  let locations = gl_utils.getLocations(gl, vertexProgram);

  let buffer = gl.createBuffer();
  if (!buffer) throw new Error('failed to create a nodesBuffer');
  let pointTexture = createCircleTexture(gl);

  let positionSize = pointCollection.is3D ? 3 : 2;
  let sizeOffset = positionSize * 4;
  let colorOffset = (positionSize + 1) * 4;
  let coloredPointStride = (positionSize + 2) * 4;  
  let uncoloredPointStride = (positionSize + 1) * 4;  

  return {
    draw,
    dispose
  };

  function dispose() {
    // TODO: Do I need gl.deleteBuffer(buffer);?
    gl.deleteProgram(vertexProgram);
    gl.deleteTexture(pointTexture);

    vertexProgramCache.remove(programKey);
  }

  function draw(drawContext) {
    gl.useProgram(vertexProgram);

    let data = pointCollection.buffer;

    gl.uniformMatrix4fv(locations.uniforms.uModel, false, pointCollection.worldModel);
    gl.uniformMatrix4fv(locations.uniforms.uCamera, false, drawContext.camera);
    gl.uniformMatrix4fv(locations.uniforms.uView, false, drawContext.view);
    gl.uniform3fv(locations.uniforms.uOrigin, drawContext.origin);

    gl.bindTexture(gl.TEXTURE_2D, pointTexture);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    if (allowColors) {
      gl.enableVertexAttribArray(locations.attributes.aPosition)
      gl.vertexAttribPointer(locations.attributes.aPosition, positionSize, gl.FLOAT, false, coloredPointStride, 0);

      gl.enableVertexAttribArray(locations.attributes.aPointSize)
      gl.vertexAttribPointer(locations.attributes.aPointSize, 1, gl.FLOAT, false, coloredPointStride, sizeOffset)

      gl.enableVertexAttribArray(locations.attributes.aColor);
      gl.vertexAttribPointer(locations.attributes.aColor, 4, gl.UNSIGNED_BYTE, true, coloredPointStride, colorOffset);
    } else {
      gl.enableVertexAttribArray(locations.attributes.aPosition)
      gl.vertexAttribPointer(locations.attributes.aPosition, positionSize, gl.FLOAT, false, uncoloredPointStride, 0)

      gl.enableVertexAttribArray(locations.attributes.aPointSize)
      gl.vertexAttribPointer(locations.attributes.aPointSize, 1, gl.FLOAT, false, uncoloredPointStride, sizeOffset)

      let color = pointCollection.color;
      gl.uniform4f(locations.uniforms.uColor, color.r, color.g, color.b, color.a);
    }

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

function getShadersCode(allowColors) {
  const fragmentShaderCode = `
  precision highp float;
  varying vec4 vColor;
  uniform sampler2D texture;

  void main() {
    vec4 tColor = texture2D(texture, gl_PointCoord);
    gl_FragColor = vec4(vColor.rgb, tColor.a);
  }
  `;

  const vertexShaderCode = shaderGraph.getVSCode([
    {
      globals() {
        return `
  attribute float aPointSize;
  attribute vec3 aPosition;
  varying vec4 vColor;
  ${allowColors ? 'attribute vec4 aColor;' : ''}
  uniform vec4 uColor;
  uniform mat4 uCamera;
  uniform mat4 uModel;
  uniform mat4 uView;
  uniform vec3 uOrigin;
`;
      },
      mainBody() {
        return `

  mat4 modelView = uView * uModel;
  vec4 mvPosition = modelView * vec4( aPosition, 1.0 );

  vec4 glPos = uCamera * mvPosition;
  gl_Position = glPos;
  vec4 glOrigin = modelView * vec4(uOrigin, 1.0);
  float cameraDist = length( glPos.xyz - glOrigin.xyz );
  gl_PointSize = max(aPointSize * 128./cameraDist, 2.);
  vColor = ${allowColors ? 'aColor.abgr' : 'uColor'};
`;
      }
    }
  ]);

  return {
    fragmentShaderCode, vertexShaderCode
  }

}