import * as THREE from 'three';

// const SERIALIZERS = {
//   Vector3: {
//     decode: (obj, prop, val) => prop.set(...val),
//     encode: (obj, val) => val.toArray(),
//   },
//   Vector2: {
//     decode: (obj, prop, val) => prop.set(...val),
//     encode: (obj, val) => val.toArray(),
//   },
//   // btVector3: {
//   //   set: (obj, prop, val) => prop.set(...val),
//   //   get: (obj, val) => val.toArray(),
//   // },
//   Quaternion: {
//     decode: (obj, prop, val) => prop.set(...val),
//     encode: (obj, val) => val.toArray(),
//   }
// };

const SAVE_TYPES = [
  {
    key: 'position',
    serializer: {
      encode: (obj) => obj.position.toArray(),
      decode: (val) => new THREE.Vector3(...val),
    },
  },
  {
    key: 'rotation',
    serializer: {
      encode: (obj) => obj.chassisMesh.quaternion.toArray(),
      decode: (val) => new THREE.Quaternion(...val),
    },
  },
];

const SAVE_KEY = 'inf-p2p:player-save';

const save = (player) => {
  const data = {};
  for (const {
    key,
    serializer: { encode },
  } of SAVE_TYPES) {
    data[key] = encode(player, key);
  }

  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
};

const load = () => {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch (_) {}

  const values = {};

  if (data && typeof data === 'object') {
    for (const {
      key,
      serializer: { decode },
    } of SAVE_TYPES) {
      const keyData = data[key];
      try {
        values[key] = decode(keyData);
      } catch (_) {}
    }
  }

  return values;
};

// Set initial position & rotation of player
// Save position & rotation every few seconds
class Saver {
  player = null;
  values = load();

  savePos = () => this.player && save(this.player);

  setPlayer(player) {
    this.player = player;

    // Save position every few seconds, and before unload
    this.saveInterval = window.setInterval(this.savePos, 2000);
    window.addEventListener('beforeunload', this.savePos);
  }

  dispose() {
    window.clearInterval(this.saveInterval);
    window.removeEventListener('beforeunload', this.savePos);
  }
}

export default Saver;
