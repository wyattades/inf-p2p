import * as THREE from 'three';


const startPos = {
  x: 1,
  y: 100,
  z: 1,
};

const save = (pos) => {
  const data = {
    x: pos.x,
    y: pos.y,
    z: pos.z,
  };
  localStorage.setItem('save', JSON.stringify(data));
};

const load = () => {
  let data;
  try {
    data = JSON.parse(localStorage.getItem('save'));
  } catch (_) {
    // Do nothing
  }
  
  const pos = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
  if (data && typeof data === 'object') {
    const { x, y, z } = data;
    if (x === +x) pos.x = x;
    if (y === +y) pos.y = y;
    if (z === +z) pos.z = z;
    return pos;
  } else {
    return pos;
  }
};

// Set initial position of player
// Save position every few seconds
export const init = (pos) => {

  // Initial position
  pos.clone(load());

  const savePos = () => save(pos);

  // Save position every 5 seconds, and before unload
  const saveInterval = window.setInterval(savePos, 5000);
  window.addEventListener('beforeunload', savePos);

  return () => {
    window.clearInterval(saveInterval);
    window.removeEventListener('beforeunload', savePos);
  };
};
