export default {
  globals() {
    return `
attribute vec2 aPosition;
uniform vec2 uScreenSize;
uniform mat4 uTransform;
`;
  },
  mainBody() {
    return `
  mat4 transformed = mat4(uTransform);

  // Translate screen coordinates to webgl space
  vec2 vv = 2.0 * uTransform[3].xy/uScreenSize;
  transformed[3][0] = vv.x - 1.0;
  transformed[3][1] = 1.0 - vv.y;
  vec2 xy = 2.0 * aPosition/uScreenSize;
  gl_Position = transformed * vec4(xy.x, -xy.y, 0.0, 1.0);
`
  }
}