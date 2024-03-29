import { createContext, useContext } from 'react';

import { useSubscribe } from 'lib/hooks/useSubscribe';
import { GameState } from 'src/GameState';
import type Game from 'src/Game';

const GameCtx = createContext<{ game: Game | null } | null>(null);

export const GameProvider = GameCtx.Provider;

export const useGame = () => {
  const game = useContext(GameCtx)?.game;
  if (!game) throw new Error('Missing GameProvider');
  return game;
};

export const useGameState = () => {
  const game = useGame();
  const state = useSubscribe(game.events, 'set_game_state', () => game.state!);
  return state ?? GameState.LOADING;
};

export const useOptions = () => {
  const game = useGame();
  const options = useSubscribe(
    game.options!.events,
    'set_option',
    () => game.options!,
    true,
  );

  const setOption: typeof options.set = (key, val) => {
    options.set(key, val);
  };

  return [options.tentative(), setOption] as const;
};
