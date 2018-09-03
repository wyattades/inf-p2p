

export const save = (player) => {
  const data = {
    x: player.x,
    y: player.y,
    z: player.z,
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
  
  if (data && typeof data === 'object') {
    return data;
  } else {
    return {};
  }
};

const startPos = {
  x: 0,
  y: 100,
  z: 0,
};

// Set initial position of player
// Save position every few seconds
export const init = (player) => {

  const { x, y, z } = load();

  player.x = x === +x ? x : startPos.x;
  player.y = y === +y ? y : startPos.y;
  player.z = z === +z ? z : startPos.z;

  // Save position every three seconds
  setInterval(() => save(player), 3000);

  window.addEventListener('beforeunload', () => save(player));
};
