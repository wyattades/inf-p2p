import * as THREE from 'three';


export const loadModel = (name) => window.fetch(`models/${name}.json`)
.then((res) => res.json())
.then((res) => {
  const obj = new THREE.ObjectLoader().parse(res);
  return obj;
});
