import gl_utils from '../glUtils';
import createMultiKeyCache from '../lines/createMultiKeyCache';
import PointCollection from './PointCollection'
import { DrawContext } from 'src/createScene';

let vertexProgramCache = createMultiKeyCache();

export default function makePointsProgram(gl: WebGLRenderingContext, pointCollection: PointCollection) {
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

  let gle = gl.getExtension('ANGLE_instanced_arrays')!;
  if (!gle) {
    // Not sure if this is going to be an error, given instancing is widely supported. But
    // If you get this error please ping me so that we can find a fallback solution
    throw new Error('PointCollection requires instancing. Please ping @anvaka so that we can add fallback');
  }

  let buffer = gl.createBuffer();
  if (!buffer) throw new Error('failed to create a nodesBuffer');

  const instanceBuffer = gl.createBuffer();
  const instanceBufferValues = new Float32Array([
    -0.5, -0.5,
    -0.5,  0.5,
     0.5,  0.5,

     0.5,  0.5,
     0.5, -0.5,
    -0.5, -0.5,
  ]);

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

    vertexProgramCache.remove(programKey);
  }

  function draw(drawContext: DrawContext) {
    if (!pointCollection.count) return;

    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(vertexProgram);

    let data = pointCollection.buffer;

    gl.uniformMatrix4fv(locations.uniforms.uModel, false, pointCollection.worldModel);
    gl.uniformMatrix4fv(locations.uniforms.projectionMatrix, false, drawContext.projection);
    gl.uniformMatrix4fv(locations.uniforms.uView, false, drawContext.view.matrix);
    gl.uniform2f(locations.uniforms.uResolution, drawContext.width, drawContext.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, instanceBufferValues, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(locations.attributes.aPoint)
    gl.vertexAttribPointer(locations.attributes.aPoint, 2, gl.FLOAT, false, 0, 0);

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

    gle.vertexAttribDivisorANGLE(locations.attributes.aPoint, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aPosition, 1);
    gle.vertexAttribDivisorANGLE(locations.attributes.aPointSize, 1);
    gle.vertexAttribDivisorANGLE(locations.attributes.aColor, 1);

    gle.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, pointCollection.count);

    gle.vertexAttribDivisorANGLE(locations.attributes.aPosition, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aPoint, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aPointSize, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aColor, 0);
    gl.disable(gl.DEPTH_TEST);
  }
}

function getShadersCode(allowColors: boolean) {
  const fragmentShaderCode = `
  precision highp float;
  varying vec4 vColor;
  uniform vec2 uResolution;
  varying vec3 vPosition;

  void main() {
    float dist = length(vPosition);

    if (dist >= 0.5) {discard;}
    gl_FragColor = vColor;
  }
  `;

  const vertexShaderCode = `
  uniform vec4 uColor;
  uniform mat4 projectionMatrix;
  uniform mat4 uModel;
  uniform mat4 uView;

  attribute float aPointSize;
  attribute vec3 aPosition;
  attribute vec3 aPoint;
  ${allowColors ? 'attribute vec4 aColor;' : ''}

  varying vec4 vColor;
  varying vec3 vPosition;

  void main() {
    vPosition = aPoint;
    gl_Position = projectionMatrix * uView * uModel * vec4( aPosition + aPoint * aPointSize, 1.0 );
    vColor = ${allowColors ? 'aColor.abgr' : 'uColor'};
  }
`;

  return {
    fragmentShaderCode, vertexShaderCode
  }

}