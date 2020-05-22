import BaseAttribute from './BaseAttribute';

export default class ColorAttribute extends BaseAttribute {
  constructor() {
    super();

    this.type = 'gl.UNSIGNED_BYTE';
    this.bufferViewType = 'Uint32Array';
  }

  getAddBlock(offset: number) {
    let variableName = `${this.name}Array`;
    let code = '';
    if (this.debug) {
      code = `if (item.${this.name} === undefined) throw new Error('Attribute "${this.name}" is missing');\n`;
    }

    code += `${variableName}[index + ${offset}] = item.${this.name};`;
    return {
      code,
      offset: offset + this.count,
    };
  }

  getGetBlock(offset: number) {
    return `${this.name}: ${this.name}Array[index + ${offset}]`;
  }

  getDraw(stride: number, offset: number) {
    let location = `${this.name}AttributeLocation`;
    return `
    if (${location} > -1) {
      gl.enableVertexAttribArray(${location});
      gl.vertexAttribPointer(${location}, 4, ${this.type}, true, ${stride}, ${offset});
    }`;
  }
}
