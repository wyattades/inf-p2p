import * as GameState from 'src/GameState';
import UI from 'src/ui';

import 'src/styles/style.scss';

const Game = require('src/Game').default;

let game;

window.cheat = {
  setPos: (x, y, z) => {
    game.player.setPos(x, y, z);
    game.loadTerrain().catch(console.error);
  },
  setTime: (hour) => game.setTime(hour),
};

const createGame = async () => {
  try {
    game = new Game();
    await game.preload();
    await game.init();
    window.GAME = game;
    await game.start();
  } catch (err) {
    console.error('createGame error:', err);
    UI.setMode(GameState.ERROR);
  }
};

createGame();

// TODO: not working
// if (process.env.NODE_ENV === 'development' && module.hot) {
//   module.hot.accept('./Game.js', () => {
//     console.log('HOT UPDATE');
//     game?.dispose();
//     Game = require('src/Game').default;
//     // Game = (await import(/* webpackChunkName: 'game' */ 'src/Game')).default;
//     createGame();
//   });
// }
