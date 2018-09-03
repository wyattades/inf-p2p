
import './styles/style.scss';

import * as game from './game';


game.init();

if (module.hot) {
  module.hot.accept('./game', () => {
    game.hotReload();
  });
}
