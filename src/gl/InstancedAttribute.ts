import BaseAttribute from "./BaseAttribute";

export default class InstancedAttribute {
  bufferValues: number[];
  typeDef?: BaseAttribute;

  constructor(bufferValues: number[]) {
    this.bufferValues = bufferValues;
    this.typeDef = undefined;
  }

  setTypeDefinition(typeDef: BaseAttribute) {
    this.typeDef = typeDef;
  }

  getInitBlock() {
    let {name} = this.typeDef!;
    return `
  const ${name}InstancedBuffer = gl.createBuffer();
  if (!${name}InstancedBuffer) throw new Error('failed to create a WebGL buffer');
  const ${name}InstancedBufferValues = new Float32Array([${this.bufferValues.join(',')}]);
  let ${name}AttributeLocation = gl.getAttribLocation(program, '${name}');
`;
  }

  getDivisor(divisor: 0|1) {
    return this.typeDef!.getDivisor(divisor);
  }

  getDraw() {
    let {typeDef} = this;
    let name = typeDef!.name;
    return `
  gl.bindBuffer(gl.ARRAY_BUFFER, ${name}InstancedBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, ${name}InstancedBufferValues, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(${name}AttributeLocation);
  gl.vertexAttribPointer(${name}AttributeLocation, ${typeDef!.count}, gl.FLOAT, false, 0, 0);
`;
  }
}
