export default {
  /**
   * Gets vertex shader code from a given array of shader graph nodes.
   */
  getVSCode: getVSCode
};

function getVSCode(nodes) {
  // We just generate shader code in multiple passes.
  let code = [] 
  nodes.forEach(node => {
    if (node.globals) code.push(node.globals());
  });
  code.push('void main() {')
  nodes.forEach(node => {
    if (node.mainBody) code.push(node.mainBody());
  });
  code.push('}')

  return code.join('\n');
}
