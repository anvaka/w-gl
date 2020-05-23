import getProgramInfo, {ProgramInfo} from "./getProgramInfo";
import ActiveTexture from "./ActiveTexture";
import BaseAttribute from "./BaseAttribute";
import InstancedAttribute from "./InstancedAttribute";
import FinalCode from "./FinalCode";


export type RenderProgram = {
  /**
   * This method adds a new vertex to the buffer and returns its id.
   *
   * The vertex is a an object, where key names match your `glsl` 
   * attribute names. For example, imagine you have this vertex shader:
   * 
   * ``` glsl
   * attribute vec3 point;
   * attribute vec4 color;
   * 
   * uniform mat4 modelViewProjection;
   * varying vec4 vColor
   * 
   * void main() {
   *   gl_Position = modelViewProjection * vec4(point, 0, 1.0);
   *   vColor = color.abgr;
   * }
   * ```
   * 
   * From JavaScript side, we can add three vertices like so:
   * 
   * ``` js
   * program.add({color: 0xff0000ff, point: [0, 0, 0]});
   * program.add({color: 0x00ff00ff, point: [0, 1, 0]});
   * program.add({color: 0x0000ffff, point: [1, 1, 0]});
   * ```
   * 
   * notice how `color` and `point` match the attributes of the vertex shader.
   */
  add: (vertex: Object) => number;

  /**
   * Similar to `add()`, this method allows to update vertex values.
   */
  update: (vertexId: number, vertex: Object) => void;

  /**
   * Reads a vertex object from the buffer. Note: this method creates a new object
   * so we don't recommend to use it in a hot path to avoid GC pressure.
   * 
   * Example:
   * 
   * ``` js
   * let vertexId = program.add({color: 0xFF00FFFF, point: [1, 1, 1]});
   * let vertex = program.get(vertexId); 
   * // vertex is now {color: 0xFF00FFFF, point: [1, 1, 1]}
   */
  get: (vertexId: number) => Object;

  /**
   * Executes WebGL draw() call with given set of uniforms and current
   * buffer.
   */
  draw: (uniforms: Object) => void;

  /**
   * De-allocates WebGL resources created by this program.
   */
  dispose: () => void;

  /**
   * Returns a string that represent javascript code to render program
   */
  getCode: () => FinalCode

  /**
   * Returns a copy of the used part of the buffer.
   * 
   * Note: actual buffer might be larger than returned copy, but we always return
   * part of the buffer that holds vertex attributes data.
   */
  getBuffer: () => ArrayBuffer

  /**
   * Appends new `buffer` content to the current buffer, starting at `offset` location
   * (offset is specified in bytes).
   * 
   * If current buffer is not big enough to hold appended data, current buffer is
   * extended to fulfill the request.
   * 
   * This method is useful when you want to load persisted buffer (from `getBuffer()`)
   */
  appendBuffer: (buffer: Uint8Array, offset: number) => void;
}

/**
 * Allows custom shader definition
 */
export type ProgramDefinition = {
  /**
   * Source code of the vertex shader. Plain string of glsl.
   */
  vertex: string;

  /**
   * Source code of the fragment shader, plane string of glsl
   */
  fragment: string;

  /**
   * How many vertices shall we reserve when buffer is created?
   * 
   * Subsequently when we call `.add()`, and there is not enough space
   * in the buffer, the buffer will be doubled in size. For best performance
   * it's best to reserve exact amount of memory upon program creation.
   */
  capacity: number;

  /**
   * If set to true, compiled javascript code has more checks and prints
   * the entire source code.
   */
  debug: boolean;

  /**
   * Provides access to webgl rendering context. This parameter may go away
   * in the future.
   */
  gl: WebGLRenderingContext;

  /**
   * Allows to create linked programs. When this is set, the new program will
   * not manage its buffer, but rather use this one as an input to own shaders.
   * 
   * Note: I'm not happy with this one yet, so it might change too.
   */
  sourceBuffer?: RenderProgram

  /**
   * Called on entrance to `draw()` method. Returns a string that needs to be inserted
   * to `draw()`. Allows custom draw logic.
   */
  preDrawHook?: (x: ProgramInfo) => string;

  /**
   * Called on exit from `draw()` method. Returns a string that needs to be inserted
   * to end of the `draw()`. Allows custom draw logic.
   */
  postDrawHook?: (x: ProgramInfo) => string;

  /**
   * Collection of attribute overrides. Attribute overrides allow developers to override
   * default guessed types. For example, a glsl `attribute vec4 color;` will be translate
   * to a `Float32Array`, with one 32bit float per color channel. That is not optimal, as the
   * same information can be fit into a single 32bit uint value. So develope can override
   * `float32` with 
   * 
   * ``` js
   *  attributes: {
   *    // tells defineProgram() to use a single 32bit integer for this attribute
   *    // instead of 4 floats.
   *    color: wgl.ColorAttribute();
   *  }
   * ```
   */
  attributes?: {
    [key: string]: BaseAttribute
  }

  /**
   * Collection of instanced attributes. Each instanced attribute should come with its own buffer.
   * Generated program then use ANGLE_instanced_arrays extension and make all draw call instanced.
   * 
   * ``` glsl
   *   attribute vec2 point;
   * ```
   * ``` js
   *  instanced: {
   *    // Make `point` instanced attribute, to render a quad:
   *    point: new wgl.InstancedAttribute([0, 0, 0, 1, 1, 1, 1, 1 0, 0, 1, 0])
   *  }
   * ```
   */
  instanced?: {
    [key: string]: InstancedAttribute
  }

  /**
   * By default order of attributes in the javascript array buffer will match their definition order 
   * in the glsl program. It works well most of the time, however if you want to serialize buffer
   * and then restore it, we recommend saving order of the attributes, so that it once restored it is
   * not affected by changed glsl code.
   * 
   * This array is just collection of attribute names, that enforces their order in the array buffer.
   */
  attributeLayout?: string[]
};

export default function defineProgram(structure: ProgramDefinition) : RenderProgram {
  let gl = structure.gl;

  let programInfo = getProgramInfo(structure);
  let glProgram = link(structure.vertex, structure.fragment);
  let preDrawHook = structure.preDrawHook || nothing;
  let postDrawHook = structure.postDrawHook || nothing;
  // TODO: Sort attributes according to layout (if layout is passed);

  let code = constructCode(programInfo);
  let drawCode = code.link();
  let programAPI = new Function("gl", "program", drawCode)(gl, glProgram);

  if (structure.debug) {
    console.log("Compiled code: ");
    console.log(drawCode);
  }

  programAPI.getCode = () => code;
  programAPI.dispose = () => {
    gl.deleteProgram(glProgram);
  };

  return programAPI;

  function constructCode(programInfo: ProgramInfo) : FinalCode {
    let finalCode = new FinalCode();

    addCodeThatCounts(programInfo, finalCode);

    if (structure.sourceBuffer) {
      addCodeThatSetsGLBuffer(programInfo, finalCode);
    } else {
      addCodeThatModifiesBuffer(programInfo, finalCode);
      addCodeThatCreatesGLBuffer(programInfo, finalCode);
    }

    addCodeThatSetsTextures(programInfo, finalCode);
    addCodeThatDrawsBuffer(programInfo, finalCode);

    return finalCode;
  }

  function addCodeThatSetsGLBuffer(programInfo, code) {
    code.addToInit(["let glBuffer;", ""]);

    code.addToAPI(["setGLBuffer: (newBuffer) => glBuffer = newBuffer,"]);
  }

  function addCodeThatCreatesGLBuffer(programInfo, code) {
    code.addToInit([
      "let glBuffer = gl.createBuffer();",
      `if (!glBuffer) throw new Error('failed to create a WebGL buffer');`,
      "",
    ]);

    code.addToAPI(["getGLBuffer: () => glBuffer,"]);
  }

  function addCodeThatSetsTextures(programInfo: ProgramInfo, code: FinalCode) {
    let { uniforms } = programInfo;
    let textures: ActiveTexture[] = [];
    uniforms.forEach((uniform) => {
      if (uniform instanceof ActiveTexture) textures.push(uniform);
    });
    if (!textures.length) return;

    code.addToAPI("setTextureCanvas: setTextureCanvas,");

    let cases = textures.map((t) => {
      return `
      case '${t.name}': {
        ${t.getTextureInitCanvasBlock()}
        return;
      }
      `;
    });

    code.addToImplementation(`
  function setTextureCanvas(textureName, textureCanvas) {
    switch(textureName) {
      ${cases.join("\n      ")}
    }
    throw new Error('Unknown texture name: ' + textureName);
  }
`);
  }

  function addCodeThatDrawsBuffer(programInfo: ProgramInfo, code: FinalCode) {
    let {
      attributes,
      instanced,
      uniforms,
      bytePerVertex,
      itemPerVertex,
    } = programInfo;

    let sourceBufferCode = structure.sourceBuffer && structure.sourceBuffer.getCode();
    if (sourceBufferCode) {
      code.addToInit(sourceBufferCode.bufferInit);
      code.addBufferInit(sourceBufferCode.bufferInit);
    } else {
      attributes.forEach((attribute) => {
        let bufferInitAttribute = "  " + attribute.getInitBlockForDraw();
        code.addToInit(bufferInitAttribute);
        code.addBufferInit(bufferInitAttribute);
      });
    }

    let textures: ActiveTexture[] = [];
    uniforms.forEach((uniform) => {
      code.addToInit("  " + uniform.getInitBlockForDraw());
      if (uniform instanceof ActiveTexture) textures.push(uniform);
    });

    if (instanced.length) {
      code.addToInit(`  let gle = gl.getExtension('ANGLE_instanced_arrays');
  if (!gle) {
    // Not sure if this is going to be an error, given instancing is widely supported. But
    // If you get this error please ping me so that we can find a fallback solution
    throw new Error('Instanced collection requires instancing support. Please ping @anvaka so that we can add fallback');
  }
`);
      instanced.forEach((instancedAttribute) => {
        code.addToInit("  " + instancedAttribute.getInitBlock());
      });
    }

    let attributesDrawBlock: string[] = [];
    if (sourceBufferCode) {
      attributesDrawBlock = sourceBufferCode.attributesDrawBlock!;
    } else {
      let byteOffset = 0;
      attributes.forEach((attribute) => {
        attributesDrawBlock.push(attribute.getDraw(bytePerVertex, byteOffset));
        byteOffset += attribute.count * attribute.bytePerElement;
      });
    }
    code.setAttributesDrawBlock(attributesDrawBlock);

    code.addToImplementation(getDrawImplementation());

    code.addToAPI(["draw: draw,"]);

    function getDrawImplementation() {
      let uniformsDrawBlock = uniforms.map((u) => u.getDraw());
      let instancedDrawBlock: string[] = [];
      let setDivisorBlock: string[] = [];
      let unsetDivisorBlock: string[] = [];

      instanced.forEach((instancedAttribute) => {
        instancedDrawBlock.push(instancedAttribute.getDraw());
        setDivisorBlock.push(instancedAttribute.getDivisor(0));
        unsetDivisorBlock.push(instancedAttribute.getDivisor(0));
      });

      let drawCallBlock: string[] = [];
      if (instanced.length) {
        attributes.forEach((attribute) => {
          setDivisorBlock.push(attribute.getDivisor(1));
          unsetDivisorBlock.push(attribute.getDivisor(0));
        });

        drawCallBlock.push(setDivisorBlock.join("\n    "));
        drawCallBlock.push(
          `gle.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, count)`
        );
        drawCallBlock.push(unsetDivisorBlock.join("\n    "));
      } else {
        drawCallBlock.push(`gl.drawArrays(gl.TRIANGLES, 0, count)`);
      }

      return ` 
  function draw(uniforms, from, to) {
    ${checkDrawCode()}
    ${checkTexturesReady()}
    ${preDrawHook(programInfo)}

    gl.useProgram(program);
    ${uniformsDrawBlock.join("\n    ")}
    ${instancedDrawBlock.join("\n    ")}

    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
    ${bufferDataIfNeeded()}

    ${attributesDrawBlock.join("\n    ")}
    ${drawCallBlock.join("\n    ")}

    ${postDrawHook(programInfo)}
  }`;

      function bufferDataIfNeeded() {
        if (structure.sourceBuffer) return "";

        return `  if (isDirty) {
          gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW);
          isDirty = false;
        }`;
      }

      function checkDrawCode() {
        return "if (count === 0) return;";
      }

      function checkTexturesReady() {
        if (textures.length === 0) return "";
        return textures
          .map((texture) => {
            return `if (!${texture.ready}) return;`;
          })
          .join("\n    ");
      }
    }
  }

  function addCodeThatCounts(programInfo, code) {
    code.addToInit(["  let count = 0;"]);
    code.addToAPI([
      "setCount: (newCount) => count = newCount,",
      "getCount: () => count,",
    ]);
  }

  function addCodeThatModifiesBuffer(programInfo, code) {
    let { attributes, bytePerVertex, itemPerVertex } = programInfo;

    code.addToInit([
      `let bytePerVertex = ${bytePerVertex};`,
      `let itemPerVertex = ${itemPerVertex};`,
      `let capacity = ${(structure.capacity || 1) * bytePerVertex};`,
      "let buffer = new ArrayBuffer(capacity);",
      "",
      "let isDirty = true;",
      "let dirtyOffset = 0;",
    ]);

    attributes.forEach((attribute) => {
      code.addToInit(
        attribute.getInitBlockForBuffer(/*includeDeclaration = */ true)
      );
    });

    code.addToAPI([
      "add: add,",
      "get: get,",
      "update: update,",
      "getBuffer: getBuffer,",
      "appendBuffer: appendBuffer,",
    ]);

    code.addToImplementation(getImplementationCode());

    function getImplementationCode() {
      let modifyBufferBlock: string[] = [];
      let getAttributeBlock: string[] = [];
      let extendBlock: string[] = [];
      let addOffset = 0;

      attributes.forEach(collectAttributeSpecificBlocks);

      return `
  function add(item) {
    if (count * bytePerVertex >= capacity) {
      extend();
    }

    let index = count * itemPerVertex;

    ${modifyBufferBlock.join("\n    ")}

    isDirty = true;
    return count++;
  }

  function update(index, item) {
    ${getUpdateMethodDebugAsserts()}
    index *= itemPerVertex;
    ${modifyBufferBlock.join("\n    ")}
    isDirty = true;
  }

  function get(index) {
    index *= itemPerVertex; 
    return {
      ${getAttributeBlock.join(",\n      ")}
    };
  }

  function extend() {
    let oldBuffer = buffer;
    capacity *= 2;
    buffer = new ArrayBuffer(capacity);
    // Copy old buffer to the new buffer
    new Uint8Array(buffer).set(new Uint8Array(oldBuffer));
    // And re-assign views:
    ${extendBlock.join("\n    ")}
  }

  function getBuffer() {
    return buffer.slice(0, count * bytePerVertex);
  }

  function appendBuffer(uint8Collection, byteOffset) {
    let requiredCapacity = byteOffset + uint8Collection.byteLength;
    if (requiredCapacity > capacity) {
      // extend the buffer to fulfill the request:
      let oldBuffer = buffer;
      buffer = new ArrayBuffer(requiredCapacity);
      new Uint8Array(buffer).set(new Uint8Array(oldBuffer));
      capacity = requiredCapacity;
    }

    let view = new Uint8Array(buffer);
    view.set(uint8Collection, byteOffset);
    count = Math.floor(requiredCapacity / bytePerVertex);

    ${extendBlock.join("\n    ")}

    isDirty = true;
  }
`;
      function collectAttributeSpecificBlocks(attribute: BaseAttribute) {
        let extendCollectionCode = attribute.getInitBlockForBuffer(
          /* includeDeclaration = */ false
        );
        if (extendCollectionCode) extendBlock.push(extendCollectionCode);

        // TODO: need a better name for this:
        let addBlock = attribute.getAddBlock(addOffset);
        modifyBufferBlock.push(addBlock.code);
        getAttributeBlock.push(attribute.getGetBlock(addOffset));
        // Every time we add an item to the collection we need to move index in the buffer
        addOffset = addBlock.offset;
      }
    }
  }

  function getUpdateMethodDebugAsserts() {
    if (!structure.debug) return '';
    return `
    if (!Number.isFinite(index)) throw new Error('update() requires integer value for "index", got: ' + index);
    if (index < 0 || index >= count) throw new Error('update(' + index + ') is outside of [0..' + count + ') range');
`;
  }

  function link(vertexSource: string, fragmentSource: string) {
    const vertex = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to link a program');

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(
        gl.getProgramInfoLog(program) || 'Failed to link a program'
      );
    }

    return program;
  }

  function compileShader(type, shaderSource) {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Failed to create a shared " + shaderSource);
    }
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      throw new Error(
        gl.getShaderInfoLog(shader) ||
          "Failed to compile shader " + shaderSource
      );
    }

    return shader;
  }
}

function nothing() {
  return "";
}
