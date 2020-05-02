import gl_utils from '../glUtils';
import createMultiKeyCache from './createMultiKeyCache';
import makeWireProgram from './makeWireProgram';
import WireCollection from './WireCollection';
import { DrawContext } from 'src/createScene';

let lineProgramCache = createMultiKeyCache();

export default function makeThickWireProgram(gl: WebGLRenderingContext, wireCollection: WireCollection) {
  let allowWidth = Number.isFinite(wireCollection.width) && 
    wireCollection.width > 0 && wireCollection.width !== 1;

  let gle: ANGLE_instanced_arrays;
  if (allowWidth) {
    gle = gl.getExtension('ANGLE_instanced_arrays') as ANGLE_instanced_arrays;
    if (!gle) {
      console.error('ANGLE_instanced_arrays is not supported, thick lines are not possible')
      return makeWireProgram(gl, wireCollection);
    }
  } else {
    return makeWireProgram(gl, wireCollection);
  }

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
  let lineStride = allowColors ? 2 * (lineSize + 1) * 4 : 2 * lineSize * 4;

  const positionBuffer = gl.createBuffer();
  const quadPositions = new Float32Array([
    -0.5, 0, -0.5, 1, 0.5, 1, // First 2D triangle of the quad
    -0.5, 0, 0.5, 1, 0.5, 0   // Second 2D triangle of the quad
  ]);

  var api = {
    isThickWire: true,
    draw,
    dispose
  };

  return api;

  function dispose() {
    if (lineBuffer) gl.deleteBuffer(lineBuffer);
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (locations) {
      gl.disableVertexAttribArray(locations.attributes.aFrom);
      gl.disableVertexAttribArray(locations.attributes.aFromColor);
      gl.disableVertexAttribArray(locations.attributes.aTo);
      gl.disableVertexAttribArray(locations.attributes.aToColor);
      gl.disableVertexAttribArray(locations.attributes.aPosition);
    }
    gl.deleteProgram(lineProgram);
    lineProgramCache.remove(programKey);
  }

  function draw(drawContext: DrawContext) {
    if (wireCollection.count === 0) return;

    let data = wireCollection.buffer;

    gl.useProgram(lineProgram);

    gl.uniformMatrix4fv(locations.uniforms.uModel, false, wireCollection.worldModel);
    gl.uniformMatrix4fv(locations.uniforms.projectionMatrix, false, drawContext.projection);
    gl.uniformMatrix4fv(locations.uniforms.uView, false, drawContext.view.matrix);
    gl.uniform3fv(locations.uniforms.uOrigin, drawContext.view.position);
    gl.uniform1f(locations.uniforms.uWidth, wireCollection.width);
    gl.uniform2f(locations.uniforms.uResolution, drawContext.width, drawContext.height);

    var color = wireCollection.color;
    gl.uniform4f(locations.uniforms.uColor, color.r, color.g, color.b, color.a);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadPositions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations.attributes.aPosition);
    gl.vertexAttribPointer(locations.attributes.aPosition, 2, gl.FLOAT, false, 0, 0)


    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(locations.attributes.aFrom)
    gl.vertexAttribPointer(locations.attributes.aFrom, lineSize, gl.FLOAT, false, lineStride, 0);

    if (allowColors) {
      gl.enableVertexAttribArray(locations.attributes.aFromColor);
      gl.vertexAttribPointer(locations.attributes.aFromColor, 4, gl.UNSIGNED_BYTE, true, lineStride, (lineSize) * 4);

      gl.enableVertexAttribArray(locations.attributes.aTo)
      gl.vertexAttribPointer(locations.attributes.aTo, lineSize, gl.FLOAT, false, lineStride, (lineSize + 1) * 4)

      gl.enableVertexAttribArray(locations.attributes.aToColor);
      gl.vertexAttribPointer(locations.attributes.aToColor, 4, gl.UNSIGNED_BYTE, true, lineStride, (2 * lineSize + 1) * 4);
    } else {
      gl.enableVertexAttribArray(locations.attributes.aTo)
      gl.vertexAttribPointer(locations.attributes.aTo, lineSize, gl.FLOAT, false, lineStride, lineSize * 4)
    }

    gle.vertexAttribDivisorANGLE(locations.attributes.aPosition, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aTo, 1);
    gle.vertexAttribDivisorANGLE(locations.attributes.aFrom, 1);
    gle.vertexAttribDivisorANGLE(locations.attributes.aFromColor, 1);
    gle.vertexAttribDivisorANGLE(locations.attributes.aToColor, 1);

    // Now that everything is setup - render!
    gle.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, wireCollection.count);

    // Don't forget to clean up after we rendered:
    gle.vertexAttribDivisorANGLE(locations.attributes.aFrom, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aTo, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aFromColor, 0);
    gle.vertexAttribDivisorANGLE(locations.attributes.aToColor, 0);
  }
}

function getShadersCode(allowColors: boolean) {
  return { 
    vert: `attribute vec3 aPosition, aFrom, aTo;
    varying vec4 vColor;
    ${allowColors ? 'attribute vec4 aFromColor, aToColor;' : ''}
    uniform vec4 uColor;
    uniform mat4 projectionMatrix;
    uniform mat4 uModel;
    uniform mat4 uView;
    uniform float uWidth;
    uniform vec2 uResolution;
  
  void main() {
    // let's get the model point to clip space:
    vec4 clip0 = projectionMatrix * uView * uModel * vec4(aFrom, 1.0);
    vec4 clip1 = projectionMatrix * uView * uModel * vec4(aTo, 1.0);

    // And from the clip space move to the screen pixels 
    // (as we set width of the lines in pixels)
    vec2 screen0 = uResolution * (0.5 * clip0.xy/clip0.w + 0.5);
    vec2 screen1 = uResolution * (0.5 * clip1.xy/clip1.w + 0.5);

    // this is direction along the x axis
    vec2 xBasis = normalize(screen1 - screen0);
    // But since we set the width, we get the direction along the Y:
    vec2 yBasis = vec2(-xBasis.y, xBasis.x);

    // Offset the original points:
    vec2 pt0 = screen0 + uWidth * aPosition.x * yBasis;
    vec2 pt1 = screen1 + uWidth * aPosition.x * yBasis;

    // and interpolate along the Y of the instanced geometry 
    // (remember, Y changes from 0 to 1):
    vec2 pt = mix(pt0, pt1, aPosition.y);
    vec4 clip = mix(clip0, clip1, aPosition.y);

    // Finally move back to the clip space:
    gl_Position = vec4(clip.w * (2.0 * pt/uResolution - 1.0), clip.z, clip.w);
    vColor = ${allowColors ? 'mix(aFromColor.abgr, aToColor.abgr, aPosition.y)' : 'uColor'};
  }`,
    frag: `precision mediump float;
    varying vec4 vColor;
    void main() {
      gl_FragColor = vColor;
    }`
  };
}