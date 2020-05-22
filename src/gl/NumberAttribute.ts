import BaseAttribute from './BaseAttribute';

export default class NumberAttribute extends BaseAttribute {
  getAddBlock(offset: number) {
    let name = this.name;
    let variableName = `${name}Array`;
    let code = '';
    if (this.debug) {
      code = `if (item.${name} === undefined) throw new Error('Attribute "${name}" is missing');`;
    }

    code += `${variableName}[index + ${offset}] = item.${name};`;
    return {
      code,
      offset: offset + this.count,
    };
  }

  getGetBlock(offset: number) {
    return `${this.name}: ${this.name}Array[index + ${offset}]`;
  }
}
