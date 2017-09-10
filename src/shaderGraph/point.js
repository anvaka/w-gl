export default {
  globals() {
    return `
attribute float aPointSize;
attribute vec4 aColor;
varying vec4 vColor;
`;
  },
  mainBody() {
    return `
  gl_PointSize = aPointSize * transformed[0][0];
  vColor = aColor;
`;
  }
};