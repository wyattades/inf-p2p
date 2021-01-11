import * as THREE from 'three';

export const loadModel = async (importer) => {
  const json = await importer;
  const obj = new THREE.ObjectLoader().parse(json);
  return obj;
};
