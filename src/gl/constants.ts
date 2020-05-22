
import FloatAttribute from './FloatAttribute';
import NumberAttribute from './NumberAttribute';

/**
 * Maps a glsl attribute type to corresponding Attribute class.
 */
export const GLTypeToBufferType = {
  vec4: () => new FloatAttribute(4),
  vec3: () => new FloatAttribute(3),
  vec2: () => new FloatAttribute(2),
  float: () => new NumberAttribute
}
