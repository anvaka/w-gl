export default {
  globals() {
    return `
attribute vec3 aPosition;
uniform mat4 projectionMatrix;
uniform mat4 uModel;
uniform mat4 uView;
uniform vec3 uOrigin;
`;
  },
  mainBody() {
    return `
  // Translate screen coordinates to webgl space
  mat4 modelView = uView * uModel;
  vec4 mvPosition = modelView * vec4( aPosition, 1.0 );

  vec4 glPos = projectionMatrix * mvPosition;
  gl_Position = glPos;
`
  }
}