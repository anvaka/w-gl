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
    float cameraDist = length( mvPosition.xyz - uOrigin );
  gl_PointSize = max(aPointSize * 128./cameraDist, 2.);
  vColor = aColor;
`;
  }
};