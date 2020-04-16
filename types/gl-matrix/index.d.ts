interface IndexedCollection {
    readonly length: number;
    [n: number]: number;
  }
  
  declare module 'gl-matrix/esm/common' {
    export function setMatrixArrayType(arrayType: any): void;
  }