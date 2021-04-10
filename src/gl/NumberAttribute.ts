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

  getMoveBlock(offset: number, lineJoin = '\n'): string {
    let name = this.name;
    let variableName = `${name}Array`;
    let code = '';
    code += `${variableName}[to + ${offset}] = ${variableName}[from + ${offset}];${lineJoin}`;
    return code;
  }

  getGetBlock(offset: number) {
    return `${this.name}: ${this.name}Array[index + ${offset}]`;
  }
}
