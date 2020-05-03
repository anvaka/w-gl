/**
 * Please ignore this. I'm still learning quaternions, and matrices and stuff.
 */
const {createScene, Element, createGuide} = window.wgl;

class BaseAttribute {
  constructor() {
    this.type = 'gl.FLOAT';
  }

  getDivisor(attribute, divisor) {
    return `gle.vertexAttribDivisorANGLE(${attribute.name}AttributeLocation, ${divisor});`
  }

  getDraw(attribute, stride, offset) {
    let {name} = attribute;
    let location = `${name}AttributeLocation`;
    return `
    gl.enableVertexAttribArray(${location});
    gl.vertexAttribPointer(${location}, ${this.count}, ${this.type}, false, ${stride}, ${offset});`
  }
}

class FloatAttribute extends BaseAttribute {
  constructor(count) {
    super();
    this.count = count;
    this.bytePerElement = 4;
    this.type = 'gl.FLOAT';
  }

  init(activeAttribute, define = false) {
    let {name} = activeAttribute;
    let arrayDefinition = `${name}Array = new Float32Array(buffer);`
    if (!define) return arrayDefinition;

    return `
  let ${arrayDefinition}
  let ${name}AttributeLocation = gl.getAttribLocation(program, '${name}');`;
  }

  getAddBlock(activeAttribute, offset) {
    let variableName = `${activeAttribute.name}Array`;
    let code = [];
    for (let i = 0; i < this.count; ++i) {
      code.push(`${variableName}[index + ${offset + i}] = item.${activeAttribute.name}[${i}];`);
    }
    return {
      code: code.join('\n'),
      offset: offset + this.count,
    };
  }
}

class NumberAttribute extends BaseAttribute {
  constructor() {
    super();
    this.count = 1;
    this.bytePerElement = 4;
  }

  init(activeAttribute, define = false) {
    let {name} = activeAttribute;
    let arrayDefinition = `${name}Array = new Float32Array(buffer);`
    if (!define) return arrayDefinition;

    return `
  let ${arrayDefinition}
  let ${name}AttributeLocation = gl.getAttribLocation(program, '${name}');`;
  }

  getAddBlock(activeAttribute, offset) {
    let variableName = `${activeAttribute.name}Array`;
    let code = `${variableName}[index + ${offset}] = item.${activeAttribute.name};`;
    return {
      code,
      offset: offset + 1,
    };
  }
}

class ColorAttribute extends BaseAttribute {
  constructor() {
    super();
    this.count = 1;
    this.bytePerElement = 4;
    this.type = 'gl.UNSIGNED_BYTE';
  }

  init(activeAttribute, define = false) {
    let {name} = activeAttribute;
    let arrayDefinition = `${name}Array = new Uint32Array(buffer);`
    if (!define) return arrayDefinition;

    return `
  let ${arrayDefinition}
  let ${name}AttributeLocation = gl.getAttribLocation(program, '${name}');`;
  }

  getAddBlock(activeAttribute, offset) {
    let variableName = `${activeAttribute.name}Array`;
    let code = `${variableName}[index + ${offset}] = item.${activeAttribute.name};`;
    return {
      code,
      offset: offset + 1,
    };
  }

  getDraw(attribute, stride, offset) {
    let {name} = attribute;
    let location = `${name}AttributeLocation`;
    return `
    gl.enableVertexAttribArray(${location});
    gl.vertexAttribPointer(${location}, 4, ${this.type}, false, ${stride}, ${offset});`
  }
}

class InstancedAttribute {
  constructor(bufferValues) {
    this.bufferValues = bufferValues;
  }

  getInitBlock(attributeInfo) {
    let {name} = attributeInfo;
    return `
  const ${name}InstancedBuffer = gl.createBuffer();
  if (!${name}InstancedBuffer) throw new Error('failed to create a WebGL buffer');
  const ${name}InstancedBufferValues = new Float32Array([${this.bufferValues.join(',')}]);
  let ${name}AttributeLocation = gl.getAttribLocation(program, '${name}');
`
  }

  getDrawBlock(attributeInfo) {
    let {name, typeDef} = attributeInfo;
    return `
  gl.bindBuffer(gl.ARRAY_BUFFER, ${name}InstancedBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, ${name}InstancedBufferValues, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(${name}AttributeLocation);
  gl.vertexAttribPointer(${name}AttributeLocation, ${typeDef.count}, gl.FLOAT, false, 0, 0);
`
  }
}

class ActiveUniform {
  constructor(name, functionName) {
    if (!functionName) throw new Error('Function name for uniform is required');
    this.name = name;
    this.functionName = functionName;
    this.location = `${this.name}UniformLocation`;
  }

  init() {
    return `let ${this.location} = gl.getUniformLocation(program, '${this.name}');`;
  }

  getDraw() {
    return `gl.${this.functionName}(${this.location}, false, uniforms.${this.name});`
  }
}

class GLInstancedCollection extends Element {
  constructor(gl) {
    super();

    this.program = defineProgram({
      gl,
      vertex: `
  uniform mat4 projectionMatrix;
  uniform mat4 model;
  uniform mat4 view;

  attribute vec2 size;
  attribute vec3 position;
  attribute vec2 point;
  attribute vec4 color;

  varying vec4 vColor;
  varying vec2 vPoint;

  void main() {
    gl_Position = projectionMatrix * view * model * vec4(position + vec3(point * size, 0.), 1.0);
    vColor = color.abgr;
    vPoint = point;
  }`,

      fragment: `
  precision highp float;
  varying vec4 vColor;
  varying vec2 vPoint;

  void main() {
    float dist = length(vPoint);

    if (dist >= 0.5) {discard;}
    gl_FragColor = vColor;
  }`,
      // These are just overrides:
      attributes: {
        color: new ColorAttribute()
      },
      instanced: {
        point: new InstancedAttribute([
          -0.5, -0.5, -0.5,  0.5, 0.5,  0.5,
          0.5,  0.5, 0.5, -0.5, -0.5, -0.5,
        ])
      }
    });
  }

  add(point) {
    this.program.add(point);
  }

  draw(gl, drawContext) {
    this.program.draw({
      projectionMatrix: drawContext.projection,
      model: this.worldModel,
      view: drawContext.view.matrix
    });
  }
}

let scene = createScene(document.querySelector('canvas'), {});
createGuide(scene);

let pointCollection = new GLInstancedCollection(scene.getGL());
let r = 10;
for (let i = 0; i < 100; ++i) {
  let position = [
    (Math.random() - 0.5) * r,
    (Math.random() - 0.5) * r,
    (Math.random()) * 100
  ]
  pointCollection.add({
    position,
    size: [1, 0.5],
    color: 0x1100aaff
  });
}
// pointCollection.add({
//   position: [0, 2, 0],
//   size: 0.5,
//   color: 0xffff00ff
// });

scene.appendChild(pointCollection)

function defineProgram(structure) {
  let gl = structure.gl;

  // TODO: Should I just hardcode these values?
  const glTypeToBufferType = {
    [gl.FLOAT_VEC4]: new FloatAttribute(4),
    [gl.FLOAT_VEC3]: new FloatAttribute(3),
    [gl.FLOAT_VEC2]: new FloatAttribute(2),
    [gl.FLOAT]: new NumberAttribute
  }

  const UniformTypeToFunctionName = {
    [gl.FLOAT_MAT4]: 'uniformMatrix4fv',
    [gl.FLOAT_MAT3]: 'uniformMatrix3fv',
    [gl.FLOAT_MAT2]: 'uniformMatrix2fv',
    [gl.FLOAT_VEC4]: 'uniform4fv',
    [gl.FLOAT_VEC3]: 'uniform3fv',
    [gl.FLOAT_VEC2]: 'uniform2fv',
    [gl.FLOAT]: 'uniform1f'
  }

  let program = link(structure.vertex, structure.fragment);
  let programInfo = getProgramInfo(program);
  // TODO: Sort attributes according to layout (if layout is passed);

  let code = compileFunctions(programInfo);
  let run = (new Function('gl', 'program', code))(gl, program);
  console.log(code);

  return {
    add: run.add,
    draw: run.draw
  }

  function compileFunctions(programInfo) {
    let bytePerVertex = 0;
    let itemPerVertex = 0;
    let {attributes, instanced, uniforms} = programInfo;

    attributes.forEach(attribute => {
      const {typeDef} = attribute;
      itemPerVertex += typeDef.count;
      bytePerVertex += typeDef.count * typeDef.bytePerElement;
    });

    let addFunction = [];
    let extendBlock = [];
    let initBlock = [];
    let attributesDrawBlock = [];
    let setDivisorBlock = [];
    let unsetDivisorBlock = [];

    let addOffset = 0;
    let byteOffset = 0;

    attributes.forEach(attribute => {
      let {typeDef} = attribute;

      let initCode = typeDef.init(attribute, true);
      if (initCode) initBlock.push(initCode);

      let extendCollectionCode = typeDef.init(attribute, false);
      if (extendCollectionCode) extendBlock.push(extendCollectionCode);

      let addBlock = typeDef.getAddBlock(attribute, addOffset);
      addOffset = addBlock.offset;
      addFunction.push(addBlock.code);

      attributesDrawBlock.push(typeDef.getDraw(attribute, bytePerVertex, byteOffset));
      byteOffset += typeDef.count * typeDef.bytePerElement;

      setDivisorBlock.push(typeDef.getDivisor(attribute, 1));
      unsetDivisorBlock.push(typeDef.getDivisor(attribute, 0));
    });

    let uniformsDrawBlock = [];
    uniforms.forEach(uniform => {
      uniformsDrawBlock.push(uniform.getDraw());
      let initCode = uniform.init();
      if (initCode) initBlock.push(initCode);
    });

    let instancedDrawBlock = [];
    instanced.forEach(instancedAttribute => {
      instancedDrawBlock.push(instancedAttribute.instanceDef.getDrawBlock(instancedAttribute))
      setDivisorBlock.push(instancedAttribute.typeDef.getDivisor(instancedAttribute, 0));
      unsetDivisorBlock.push(instancedAttribute.typeDef.getDivisor(instancedAttribute, 0));
    })

    let drawCallBlock = []
    if (instanced.length) {
      drawCallBlock.push(setDivisorBlock.join('\n    '));
      drawCallBlock.push(`gle.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, count)`);
      drawCallBlock.push(unsetDivisorBlock.join('\n    '));
    }


// function createCollection(gl, program) {
    let finalCode = `
  let glBuffer = gl.createBuffer();
  if (!glBuffer) throw new Error('failed to create a WebGL buffer');
${getInstancedInitCode()}
  let count = 0;
  let bytePerVertex = ${bytePerVertex};
  let itemPerVertex = ${itemPerVertex};
  let capacity = ${(structure.capacity || 1) * bytePerVertex};
  let buffer = new ArrayBuffer(capacity);
  ${initBlock.join('\n  ')}
  let isDirty = true;

  return {
    add: add,
    draw: draw,
    setCount: (newCount) => count = newCount
  };

  function draw(uniforms) {
    if (count === 0) return;
    // TODO: Insert pre-draw
    gl.useProgram(program);
    ${uniformsDrawBlock.join('\n    ')}
    ${instancedDrawBlock.join('\n    ')}

    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
    if (isDirty) {
      gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW);
      isDirty = false;
    }
    ${attributesDrawBlock.join('\n    ')}
    ${drawCallBlock.join('\n    ')}
  }

  function add(item) {
    if (count * bytePerVertex >= capacity) extend();
    let index = count * itemPerVertex;

    ${addFunction.join('\n    ')}

    isDirty = true;
    return count++;
  }

  function extend() {
    let oldBuffer = buffer;
    capacity *= 2;
    buffer = new ArrayBuffer(capacity);
    // Copy old buffer to new buffer
    new Uint8Array(buffer).set(new Uint8Array(oldBuffer));
    ${extendBlock.join('\n    ')}
  }
`

    return finalCode;

    function getInstancedInitCode() {
      if (!instanced.length) return '';
      let instancedInitBlock = [];

      instanced.forEach(instancedAttribute => {
        let initInstancedBlock = instancedAttribute.instanceDef.getInitBlock(instancedAttribute);
        if (initInstancedBlock) instancedInitBlock.push(initInstancedBlock);
      });


      return `  let gle = gl.getExtension('ANGLE_instanced_arrays');
  if (!gle) {
    // Not sure if this is going to be an error, given instancing is widely supported. But
    // If you get this error please ping me so that we can find a fallback solution
    throw new Error('Instanced collection requires instancing support. Please ping @anvaka so that we can add fallback');
  }
  ${instancedInitBlock.join('\n  ')}`
    }
  }

  function getProgramInfo(program) {
    let attributes = [];
    let instancedAttributes = [];
    let numberOfAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

    for (var i = 0; i < numberOfAttributes; ++i) {
      var activeAttribute = gl.getActiveAttrib(program, i);
      if (!activeAttribute) {
        continue;
      }
      const {name, type} = activeAttribute;
      let typeDef = (structure.attributes && structure.attributes[name]) || glTypeToBufferType[type];
      if (!typeDef) {
        console.error('Unknown type for ', activeAttribute);
        throw new Error('Unknown type for ' + activeAttribute)
      }

      const attributeInfo = {
        name: activeAttribute.name,
        typeDef
      };
      let instanceDef = structure.instanced && structure.instanced[name];
      if (instanceDef) {
        instancedAttributes.push({
          name: attributeInfo.name,
          typeDef,
          instanceDef
        })
      } else {
        attributes.push(attributeInfo);
      }
    }

    let numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    let uniforms = [];

    for (let i = 0; i < numberOfUniforms; ++i) {
      var activeUniform = gl.getActiveUniform(program, i);
      if (!activeUniform) continue;
      const name = activeUniform.name;
      uniforms.push(new ActiveUniform(name, UniformTypeToFunctionName[activeUniform.type]));
    }

    return {attributes, instanced: instancedAttributes, uniforms};
  }

  function link(vertexSource, fragmentSource) {
    const vertex = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to link a program');
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Failed to link a program');
    }

    return program;
  }

  function compileShader(type, shaderSource) {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create a shared ' + shaderSource);
    }
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      throw new Error(gl.getShaderInfoLog(shader) || 'Failed to compile shader ' + shaderSource);
    }

    return shader;
  }
}