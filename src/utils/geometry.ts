import _ from 'lodash';
import { BufferAttribute } from 'three';

export const serializeBufferAttr = (attr: THREE.BufferAttribute) => {
  return _.pick(attr, 'array', 'itemSize', 'normalized');
};

type SerializedBufferAttribute = ReturnType<typeof serializeBufferAttr>;

export const deserializeBufferAttr = (
  data: SerializedBufferAttribute,
): THREE.BufferAttribute =>
  new BufferAttribute(data.array, data.itemSize, data.normalized);
