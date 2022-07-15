import React, { useEffect, useRef } from 'react';
import { useEvent, useUpdate } from 'react-use';

import { GameProvider } from 'lib/hooks/game';
import { StateOverlay } from 'components/UI';

import Game from 'src/Game';
import { GameState } from 'src/GameState';

export const Play: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  const update = useUpdate();
  const gameRef = useRef<Game | null>(null);

  const initGame = async () => {
    const prev = gameRef.current;
    if (prev) {
      gameRef.current = null;
      update();
      prev.dispose();
    }

    const GameClass = (await import('src/Game')).default;
    console.log('Loaded Game class');
    if (!canvas.current) throw new Error('Missing game DOM container');
    const newGame = new GameClass(canvas.current);
    await newGame.setup();
    gameRef.current = newGame;
    update();
  };

  useEffect(() => {
    initGame();
  }, []);

  useEvent('reinitialized', update, gameRef.current?.events);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      let mounted = true;
      // @ts-expect-error bad ImportMeta
      import.meta.webpackHot?.accept('src/Game.js', async () => {
        if (!mounted) return;
        console.log('Accepting the updated "src/Game" module');
        initGame();
      });
      return () => {
        mounted = false;
      };
    }
  }, []);

  useEffect(() => {
    return () => {
      const endGame = gameRef.current;
      if (endGame) {
        console.log('Unmount game');
        if (!endGame.disposed) endGame.dispose();
      }
    };
  }, []);

  const game = gameRef.current;

  return (
    <GameProvider value={{ game }}>
      <canvas ref={canvas} id="game" />
      {game ? children : <StateOverlay gameState={GameState.LOADING} />}
    </GameProvider>
  );
};
