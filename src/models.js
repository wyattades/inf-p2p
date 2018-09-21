// import * as THREE from 'three';

import MTLLoader from './models/MTLLoader';
import OBJLoader from './models/OBJLoader';


export const loadModel = (name) => new Promise((resolve, reject) => {
  new MTLLoader()
  .load(`models/${name}.mtl`, (materials) => {

    materials.preload();

    new OBJLoader()
    .setMaterials(materials)
    .load(`models/${name}.obj`, (object) => {
      resolve(object);
    }, null, reject);
  });
});
