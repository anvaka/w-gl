/**
 * Helper class that holds intermediate state of the code before it is 
 * compiled to javascript.
 */
export default class FinalCode {
  /**
   * Collection of strings to be put into program API block;
   */
  api: string[];

  /**
   * Collection of string to be put into initialization block of the code;
   */
  init: string[];

  /**
   * Collection of the strings that initialize buffers.
   */
  bufferInit: string[];

  /**
   * Collection of strings to be put into the implementation section (after return API statement)
   */
  implementation: string[];

  attributesDrawBlock?: string[];

  constructor() {
    this.api = [];
    this.init = [];
    this.implementation = [];

    // Share buffer init so that multiple programs can re-use buffers.
    this.bufferInit = [];
  }

  addToInit(block) {
    if (block) this.init.push(block);
  }
  addBufferInit(block) {
    if (block) this.bufferInit.push(block);
  }

  addToAPI(block) {
    if (block) this.api.push(block);
  }
  addToImplementation(block) {
    if (block) this.implementation.push(block);
  }

  setAttributesDrawBlock(block: string[]) {
    this.attributesDrawBlock = block;
  }

  link() {
    let finalBuffer: string[] = [];

    this.init.forEach(addToFinalBuffer);

    addToFinalBuffer("  return {");
    this.api.forEach(addToFinalBuffer);
    addToFinalBuffer("  };");

    this.implementation.forEach(addToFinalBuffer);
    return finalBuffer.join("\n");

    function addToFinalBuffer(b: string | string[]) {
      if (Array.isArray(b)) finalBuffer.push(b.join("\n    "));
      else finalBuffer.push(b);
    }
  }
}