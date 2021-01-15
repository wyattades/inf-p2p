import * as options from './options';
import * as GameState from './GameState';

import './styles/style.scss';

let Game = require('./Game').default;

let game;

window.cheat = {
  game,
  pause: () => game.setState(GameState.PAUSED),
  resume: () => game.setState(GameState.PLAYING),
  clearMapCache: () => game.chunkLoader.clearMapCache(),
  setPos: (x, y, z) => {
    game.player.setPos(x, y, z);
    game.loadTerrain().catch(console.error);
  },
  setTime: (hour) => game.setTime(hour),
  setOption: (key, val) => options.set(key, val),
};

const createGame = async () => {
  try {
    game = new Game();
    await game.preload();
    await game.init();
    window.cheat.game = game;
    await game.start();
  } catch (err) {
    console.error('createGame error:', err);
    document.querySelector('#text-overlay .loader').classList.add('hidden');
    document.querySelector('#text-overlay .error').classList.remove('hidden');
  }
};

createGame();

if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./Game.js', () => {
    game?.dispose();
    Game = require('./Game').default;
    createGame();
  });
}
