/**
 * Base class for attribute code generators. Attribute code generators are responsible
 * for mapping glsl attributes to javascript buffers and states.
 * 
 * For example, imagine your glsl has the following attribute:
 * 
 * ``` glsl
 * attribute vec2 point;
 * ```
 * 
 * We generate a code that allows javascript clients add vertex to collection:
 * 
 * ``` js
 * program.add({
 *   point: [1, 4]
 * })
 * ```
 * 
 * And render it:
 * 
 * ``` js
 * program.draw()
 * ```
 * 
 * Code generator from glsl type to javascript starts in BaseAttribute:
 */
export default class BaseAttribute {
  /**
   * type of the attribute that is used in `gl.vertexAttribPointer()`.
   */
  type: string;

  /**
   * If true - more checks are performed
   */
  debug: boolean

  /**
   * Type of the buffer view. Used for setting values
   */
  bufferViewType: string

  /**
   * Number of components per vertex attribute, used in `gl.vertexAttribPointer()`
   */
  count: number;

  /**
   * attribute name in glsl. Has to be set before calling any instance methods.
   */
  name?: string

  /**
   * How many bytes each component takes? Most of the type it should be just 4.
   */
  bytePerElement: number;

  constructor() {
    this.type = 'gl.FLOAT';
    this.debug = false;
    this.bufferViewType = 'Float32Array';
    this.count = 1;
    this.name = undefined;
    this.bytePerElement = 4;
  }

  setName(name) {
    this.name = name;
  }

  getInitBlockForBuffer(includeDeclaration) {
    this.ensureNameIsSet();
    let prefix = includeDeclaration ? 'let ' : '';
    return `${prefix}${this.name}Array = new ${this.bufferViewType}(buffer);`;
  }

  getInitBlockForDraw() {
    this.ensureNameIsSet();

    let { name } = this;
    return `let ${name}AttributeLocation = gl.getAttribLocation(program, '${name}');`;
  }

  /**
   * "Add block" returns code that adds attribute values to the shared buffer.
   */
  getAddBlock(offset: number, join?: string): AddBlock {
    throw new Error('Concrete types have to implement this');
  }

  getMoveBlock(offset: number, join?: string): string {
    throw new Error('Concrete type have to implement `getMoveBlock`')
  }

  /**
   * "Get block" returns code that reconstructs attribute's values from the shared buffer
   */
  getGetBlock(offset: number): string {
    throw new Error('Concrete types have to implement `getGetBlock`');
  }

  getDivisor(divisor: 0|1) {
    this.ensureNameIsSet();
    let location = `${this.name}AttributeLocation`;
    return `if (${location} > -1) gle.vertexAttribDivisorANGLE(${location}, ${divisor});`;
  }

  getDraw(stride, offset) {
    this.ensureNameIsSet();
    let location = `${this.name}AttributeLocation`;

    return `
    gl.enableVertexAttribArray(${location});
    gl.vertexAttribPointer(${location}, ${this.count}, ${this.type}, false, ${stride}, ${offset});`;
  }

  ensureNameIsSet() {
    if (!this.name) {
      throw new Error('You have to call setName() before using attributes');
    }
  }
}

export type AddBlock = {
  code: string,
  offset: number
}