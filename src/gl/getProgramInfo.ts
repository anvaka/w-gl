import ActiveUniform from './ActiveUniform';
import ActiveTexture from './ActiveTexture';
import { GLTypeToBufferType } from './constants';
import BaseAttribute from './BaseAttribute';
import InstancedAttribute from './InstancedAttribute';
import {ProgramDefinition} from './defineProgram';

export type ProgramInfo = {
    bytePerVertex: number;
    itemPerVertex: number;
    attributes: BaseAttribute[];
    instanced: InstancedAttribute[];
    uniforms: (ActiveTexture | ActiveUniform)[];
}

export default function getProgramInfo(programDefinition: ProgramDefinition, isWGL2: boolean): ProgramInfo {
  let attributes: BaseAttribute[] = [];
  let instancedAttributes: InstancedAttribute[] = [];

  let parsedProgram = parseProgram(programDefinition.vertex, programDefinition.fragment, isWGL2);

  parsedProgram.attributes.forEach(attribute => {
    const { name, type } = attribute;
    let typeDef = programDefinition.attributes && programDefinition.attributes[name];
    if (!typeDef && typeof GLTypeToBufferType[type] === 'function') {
      typeDef = GLTypeToBufferType[type]();
    }
    if (!typeDef) {
      console.error(`Unknown type ${type} for ${name}`);
      throw new Error(`Unknown type ${type} for ${name}`);
    }
    typeDef.debug = (programDefinition && programDefinition.debug) || false;
    typeDef.setName(name);

    let instancedAttribute = programDefinition.instanced && programDefinition.instanced[name];
    if (instancedAttribute) {
      instancedAttribute.setTypeDefinition(typeDef);
      instancedAttributes.push(instancedAttribute)
    } else {
      attributes.push(typeDef);
    }
  });

  let uniforms: (ActiveTexture | ActiveUniform)[] = [];
  let textureCount = 0;
  parsedProgram.uniforms.forEach(uniform => {
    const name = uniform.name;
    if (uniform.type === 'sampler2D') {
      uniforms.push(new ActiveTexture(name, textureCount++));
    } else {
      uniforms.push(new ActiveUniform(name, uniform.type));
    }
  });

  let bytePerVertex = 0;
  let itemPerVertex = 0;

  attributes.forEach(attribute => {
    itemPerVertex += attribute.count;
    bytePerVertex += attribute.count * attribute.bytePerElement;
  });

  if (programDefinition.attributeLayout) {
    let order = new Map()
    programDefinition.attributeLayout.forEach((item, index) => order.set(item, index));
    attributes.sort((a, b) => order.get(a.name) - order.get(b.name));
  }

  return {
    bytePerVertex,
    itemPerVertex,
    attributes,
    instanced: instancedAttributes,
    uniforms,
  };
}

function parseProgram(vertex: string, fragment: string, isWGL2: boolean) {
  // TODO: this wouldn't work for multiline attribute definitions
  let attribute = isWGL2 ? /in\s+(.+);/ :  /attribute\s+(.+);/
  let uniform = /uniform\s+(.+);/
  let attributes: {type: string, name: string}[] = [];
  let uniforms:{type: string, name: string}[] = [];

  vertex.split('\n').forEach(line => {
    let attributeMatch = line.match(attribute)
    if (attributeMatch && !line.trim().startsWith('//')) {
      appendVariables(attributeMatch[1], attributes);
      return;
    }

    let uniformMatch = line.match(uniform);
    if (uniformMatch && !line.trim().startsWith('//')) {
      appendVariables(uniformMatch[1], uniforms)
      return;
    }
  });

  // fragment can have only uniforms
  fragment.split('\n').forEach(line => {
    let uniformMatch = line.match(uniform);
    if (uniformMatch) appendVariables(uniformMatch[1], uniforms)
  });


  return { attributes, uniforms }

  function appendVariables(variableDefinition, collection) {
    let parts = variableDefinition.replace(/,/g, ' ').split(' ').filter(x => x);
    let type = parts[0];
    for (let i = 1; i < parts.length; ++i) {
      let name = parts[i];
      if (!collection.find(x => x.name === name)) collection.push({ type, name });
    }
  }
}

