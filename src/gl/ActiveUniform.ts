/**
 * Maps a glsl uniform type to corresponding
 */
export const UniformTypeToFunctionName = {
  mat4: 'uniformMatrix4fv',
  mat3: 'uniformMatrix3fv',
  mat2: 'uniformMatrix2fv',
  vec4: 'uniform4fv',
  vec3: 'uniform3fv',
  vec2: 'uniform2fv',
  float: 'uniform1f',
  bool: 'uniform1i',
  int: 'uniform1i',
}

/**
 * Defines a single uniform attribute in the GLSL shader
 */
export default class ActiveUniform {
  /**
   * Name of the uniform
   */
  name: string;

  /**
   * Name of the function that sets uniform value on `gl`. E.g. `uniformMatrix4fv`
   */
  functionName: string;

  /**
   * Name of the variable that holds uniform location.
   */
  location: string;

  constructor(name: string, variableType: string) {
    let functionName = UniformTypeToFunctionName[variableType];

    if (!functionName)
      throw new Error('Function name for uniform is required');
    this.name = name;
    this.functionName = functionName;
    this.location = `${this.name}UniformLocation`;
  }

  getInitBlockForDraw() {
    return `let ${this.location} = gl.getUniformLocation(program, '${this.name}');`;
  }

  getDraw() {
    if (this.functionName.indexOf('Matrix') > -1) {
      return `gl.${this.functionName}(${this.location}, false, uniforms.${this.name});`;
    }
    else {
      return `gl.${this.functionName}(${this.location}, uniforms.${this.name});`;
    }
  }
}
