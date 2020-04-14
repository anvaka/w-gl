const glUtils = {
  compile,
  link,
  getLocations,
  getAttributes,
  getUniforms,
  initBuffer
};

export default glUtils;

function compile(gl: WebGLRenderingContext, type: GLenum, shaderSrc: string) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSrc);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }

  return shader;
}

function link(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }

  return program;
}

function getLocations(gl: WebGLRenderingContext, program: WebGLProgram) {
  return {
    attributes: getAttributes(gl, program),
    uniforms: getUniforms(gl, program)
  }
}

function getAttributes(gl: WebGLRenderingContext, program: WebGLProgram) {
  var attributes = Object.create(null);

  var numberOfAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (var i = 0; i < numberOfAttributes; ++i) {
    var name = gl.getActiveAttrib(program, i).name;
    attributes[name] = gl.getAttribLocation(program, name)
  }

  return attributes;
}

function getUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
  var uniforms = Object.create(null);
  var numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (var i = 0; i < numberOfUniforms; ++i) {
    var name = gl.getActiveUniform(program, i).name;
    uniforms[name] = gl.getUniformLocation(program, name)
  }

  return uniforms;
}

function initBuffer(gl: WebGLRenderingContext, data: BufferSource | null, elementsPerVertex: number, attribute: number) {
  var buffer = gl.createBuffer();
  if (!buffer) throw new Error('Failed to create a buffer');

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.vertexAttribPointer(attribute, elementsPerVertex, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribute);
}