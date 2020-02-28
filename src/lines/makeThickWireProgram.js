import gl_utils from '../glUtils';
import createMultiKeyCache from './createMultiKeyCache';
import makeWireProgram from './makeWireProgram';

let lineProgramCache = createMultiKeyCache();

export default function makeThickWireProgram(gl, wireCollection) {
  let allowColors = !!wireCollection.allowColors;
  let allowWidth = Number.isFinite(wireCollection.width) && wireCollection.width > 0;
  let gle;
  if (allowWidth) {
    gle = gl.getExtension('ANGLE_instanced_arrays');
    if (!gle) {
      console.error('ANGLE_instanced_arrays is not supported, thick lines are not possible')
      return makeWireProgram(gl, wireCollection);
    }
  } else {
    return makeWireProgram(gl, wireCollection);
  }

  let programKey = [allowColors, gl];
  let lineProgram = lineProgramCache.get(programKey)

  if (!lineProgram) {
    const { frag, vert } = getShadersCode(allowColors, allowWidth);
    var lineVSShader = gl_utils.compile(gl, gl.VERTEX_SHADER, vert);
    var lineFSShader = gl_utils.compile(gl, gl.FRAGMENT_SHADER, frag);
    lineProgram = gl_utils.link(gl, lineVSShader, lineFSShader);
    lineProgramCache.set(programKey, lineProgram);
  }

  let locations = gl_utils.getLocations(gl, lineProgram);

  let lineBuffer = gl.createBuffer();
  let lineSize = wireCollection.is3D ? 3 : 2;
  let lineStride = allowColors ? 2 * (lineSize + 1) * 4 : 2 * lineSize * 4;

  const positionBuffer = gl.createBuffer();
  const quadPositions = new Float32Array([
    0, -0.5, 0,
    0, -0.5, 1,
    0, 0.5, 1,

    0, -0.5, 0,
    0, 0.5, 1,
    0, 0.5, 0
  ]);

  var api = {
    draw,
    dispose
  }

  return api;

  function dispose() {
    if (lineBuffer) gl.deleteBuffer(lineBuffer);
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    gl.deleteProgram(lineProgram);
    lineProgramCache.remove(programKey);
  }

  function draw(drawContext) {
    if (wireCollection.count === 0) return;

    let data = wireCollection.buffer;

    gl.useProgram(lineProgram);

    gl.uniformMatrix4fv(locations.uniforms.uModel, false, wireCollection.worldModel);
    gl.uniformMatrix4fv(locations.uniforms.uCamera, false, drawContext.camera);
    gl.uniformMatrix4fv(locations.uniforms.uView, false, drawContext.view);
    gl.uniform3fv(locations.uniforms.uOrigin, drawContext.origin);
    gl.uniform1f(locations.uniforms.uWidth, wireCollection.width);
    gl.uniform2f(locations.uniforms.uResolution, drawContext.width, drawContext.height);

    var color = wireCollection.color;
    gl.uniform4f(locations.uniforms.uColor, color.r, color.g, color.b, color.a);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadPositions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations.attributes.aPosition);
    gl.vertexAttribPointer(locations.attributes.aPosition, 3, gl.FLOAT, false, 0, 0)
    gle.vertexAttribDivisorANGLE(locations.attributes.aPosition, 0);


    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(locations.attributes.aFrom)
    gl.vertexAttribPointer(locations.attributes.aFrom, lineSize, gl.FLOAT, false, lineStride, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aFrom, 1);

    if (allowColors) {
      gl.enableVertexAttribArray(locations.attributes.aFromColor);
      gl.vertexAttribPointer(locations.attributes.aFromColor, 4, gl.UNSIGNED_BYTE, true, lineStride, (lineSize) * 4);
      gle.vertexAttribDivisorANGLE(locations.attributes.aFromColor, 1);

      gl.enableVertexAttribArray(locations.attributes.aTo)
      gl.vertexAttribPointer(locations.attributes.aTo, lineSize, gl.FLOAT, false, lineStride, (lineSize + 1) * 4)
      gle.vertexAttribDivisorANGLE(locations.attributes.aTo, 1);

      gl.enableVertexAttribArray(locations.attributes.aToColor);
      gl.vertexAttribPointer(locations.attributes.aToColor, 4, gl.UNSIGNED_BYTE, true, lineStride, (2 * lineSize + 1) * 4);
      gle.vertexAttribDivisorANGLE(locations.attributes.aToColor, 1);
    } else {
      gl.enableVertexAttribArray(locations.attributes.aTo)
      gl.vertexAttribPointer(locations.attributes.aTo, lineSize, gl.FLOAT, false, lineStride, lineSize * 4)
      gle.vertexAttribDivisorANGLE(locations.attributes.aTo, 1);
    }
    // gl.drawArrays(gl.TRIANGLES, 0, 6);
    gle.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, wireCollection.count);

    gle.vertexAttribDivisorANGLE(locations.attributes.aFrom, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aTo, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aFromColor, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aToColor, 0);
  }
}

function getShadersCode(allowColors) {
  return { 
    vert: `attribute vec3 aPosition, aFrom, aTo;
    varying vec4 vColor;
    ${allowColors ? 'attribute vec4 aFromColor, aToColor;' : ''}
    uniform vec4 uColor;
    uniform mat4 uCamera;
    uniform mat4 uModel;
    uniform mat4 uView;
    uniform float uWidth;
    uniform vec2 uResolution;
  
  void main() {
    vec4 clip0 = uCamera * uView * uModel * vec4(aFrom, 1.0);
    vec4 clip1 = uCamera * uView * uModel * vec4(aTo, 1.0);
    vec2 screen0 = uResolution * (0.5 * clip0.xy/clip0.w + 0.5);
    vec2 screen1 = uResolution * (0.5 * clip1.xy/clip1.w + 0.5);
    vec2 xBasis = normalize(screen1 - screen0);
    vec2 yBasis = vec2(-xBasis.y, xBasis.x);
    vec2 pt0 = screen0 + uWidth * (aPosition.x * xBasis + aPosition.y * yBasis);
    vec2 pt1 = screen1 + uWidth * (aPosition.x * xBasis + aPosition.y * yBasis);
    vec2 pt = mix(pt0, pt1, aPosition.z);
    vec4 clip = mix(clip0, clip1, aPosition.z);
    gl_Position = vec4(clip.w * (2.0 * pt/uResolution - 1.0), clip.z, clip.w);

    vColor = ${allowColors ? 'mix(aFromColor.abgr, aToColor.abgr, aPosition.z)' : 'uColor'};
  }`,
    frag: `precision mediump float;
    varying vec4 vColor;
    void main() {
      gl_FragColor = vColor;
    }`
  };
}