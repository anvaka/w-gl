import BaseAttribute from './BaseAttribute';

export default class FloatAttribute extends BaseAttribute {
  constructor(count: number) {
    super();
    this.count = count;
  }

  getAddBlock(offset: number, lineJoin = '\n') {
    let name = this.name!;
    let variableName = `${name}Array`;
    let code: string[] = [];
    if (this.debug) {
      code.push(`if (item.${name} === undefined) throw new Error('Attribute "${name}" is missing');\n`);
    }
    for (let i = 0; i < this.count; ++i) {
      let read = `item.${name}[${i}]`;
      if (this.debug) {
        code.push(`if (${read} === undefined) throw new Error('Attribute "${name}" is missing value at index ${i}');\n`);
      }
      code.push(`${variableName}[index + ${offset + i}] = ${read};`);
    }
    return {
      code: code.join(lineJoin),
      offset: offset + this.count,
    };
  }

  getGetBlock(offset: number) {
    let variableName = `${this.name}Array`;
    let code: string[] = [];
    for (let i = 0; i < this.count; ++i) {
      code.push(`${variableName}[index + ${offset + i}]`);
    }

    return `${this.name}: [${code.join(', ')}]`;
  }
}
