
import './styles/style.scss';
import * as options from './options';
let Game = require('./Game').default;


let game;

window.cheat = {
  pause: () => game.setState('PAUSED'),
  resume: () => game.setState('PLAYING'),
  setPos: (x, y, z) => {
    game.player.setPos(x, y, z);
    game.chunkLoader.loadInitial(game.player.position.x, game.player.position.z).catch(console.error);
  },
  setTime: (hour) => game.setTime(hour),
  setOption: (key, val) => options.set(key, val),
  gameState: null,
};

game = new Game();
game.chunkLoader.loadInitial(game.player.position.x, game.player.position.z).then(() => {
  game.start();
})
.catch(console.error);

if (module.hot) {
  module.hot.accept('./Game', () => {
    Game = require('./Game').default;
    game.dispose();
    game = new Game();
    game.chunkLoader.loadInitial(game.player.position.x, game.player.position.z).then(() => {
      game.start();
    })
    .catch(console.error);
  });
}
