import { mapValues, pick } from 'lodash';
import { BufferAttribute, BufferGeometry } from 'three';

export const serializeBufferAttr = (
  attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
) => {
  if ((attr as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) {
    throw new Error('InterleavedBufferAttribute is not supported');
  }
  return pick(attr, 'array', 'itemSize', 'normalized');
};

type SerializedBufferAttribute = ReturnType<typeof serializeBufferAttr>;

export const deserializeBufferAttr = (
  data: SerializedBufferAttribute,
): THREE.BufferAttribute =>
  new BufferAttribute(data.array, data.itemSize, data.normalized);

export const serializeGeometry = (geometry: THREE.BufferGeometry) => {
  return {
    indexAttribute: geometry.index
      ? serializeBufferAttr(geometry.index)
      : undefined,
    attributes: mapValues(geometry.attributes, (attr) =>
      serializeBufferAttr(attr),
    ),
  };
};

type SerializedGeometry = ReturnType<typeof serializeGeometry>;

export const deserializeGeometry = ({
  attributes,
  indexAttribute,
}: SerializedGeometry): THREE.BufferGeometry => {
  const geometry = new BufferGeometry();
  for (const key in attributes) {
    const attr = attributes[key];
    if (attr) {
      geometry.setAttribute(key, deserializeBufferAttr(attr));
    }
  }
  if (indexAttribute) geometry.setIndex(deserializeBufferAttr(indexAttribute));
  return geometry;
};
