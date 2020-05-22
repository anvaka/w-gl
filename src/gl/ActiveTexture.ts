/**
 * Describes a single texture in the glsl program.
 * 
 * Note: this class is very limited at the moment and has strong assumptions about texture format and source
 * It will grow based on client needs.
 */
export default class ActiveTexture {
  /**
   * Name of the texture sample in the glsl code
   */
  name: string;

  /**
   * Texture unit number. External code is supposed to give it, and increment
   * with every new texture bound to program.
   */
  offset: number;

  /**
   * Name of the variable that references WebGLTexture object in the compiled javascript code
   */
  variableName: string;

  /**
   * Name of the variable that indicates readiness of the texture. Texture becomes ready when
   * someone calls texture init block (which ultimately uses `texImage2D`)
   */
  ready: string;

  /**
   * Name of the variable that points to uniform location associated with the texture.
   */
  location: string;

  /**
   * Always set to true. Used by external code to check the nature of the uniform variable.
   */
  isTexture: boolean;

  constructor(name: string, offset = 0) {
    this.name = name;
    this.offset = offset;
    this.variableName = `${name}Texture`;
    this.ready = `${this.variableName}Ready`;

    this.location = `${this.name}UniformLocation`;
    this.isTexture = true;
  }

  getInitBlockForDraw() {
    return `
  let ${this.location} = gl.getUniformLocation(program, '${this.name}');
  let ${this.variableName} = gl.createTexture();
  let ${this.ready} = false;
`
  }

  getTextureInitCanvasBlock() {
    return `
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, ${this.variableName});
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  ${this.ready} = true`
  }

  getDraw() {
    return `
    gl.activeTexture(gl.TEXTURE${this.offset});
    gl.bindTexture(gl.TEXTURE_2D, ${this.variableName});
    gl.uniform1i(${this.location}, ${this.offset});
`
  }
}
