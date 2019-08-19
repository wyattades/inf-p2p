import './styles/style.scss';
import * as options from './options';
import * as GameState from './GameState';
let Game = require('./Game').default;

require.context('./static', true);

let game = new Game();
game.start();

window.cheat = {
  game,
  pause: () => game.setState(GameState.PAUSED),
  resume: () => game.setState(GameState.PLAYING),
  setPos: (x, y, z) => {
    game.player.setPos(x, y, z);
    game.loadTerrain().catch(console.error);
  },
  setTime: (hour) => game.setTime(hour),
  setOption: (key, val) => options.set(key, val),
};

if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./Game', () => {
    Game = require('./Game').default;
    game.dispose();
    game = new Game();
    game.start();
    window.cheat.game = game;
  });
}
