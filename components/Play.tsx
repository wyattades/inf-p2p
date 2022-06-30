import { useEffect, useRef, useState } from 'react';
import { useLatest } from 'react-use';

import Game from 'src/Game';

export const Play = () => {
  const canvas = useRef<HTMLCanvasElement>(null);

  const [game, setGame] = useState<Game | null>(null);
  const latestGame = useLatest(game);

  const initGame = async () => {
    const prev = latestGame.current;
    if (prev) {
      setGame(null);
      prev.dispose();
    }

    const GameClass = (await import('src/Game')).default;
    console.log('Loaded Game class');
    if (!canvas.current) throw new Error('Missing game DOM container');
    const newGame = new GameClass(canvas.current);
    await newGame.setup();
    setGame(newGame);
  };

  useEffect(() => {
    initGame();
  }, []);

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
  }, [latestGame]);

  useEffect(() => {
    return () => {
      const endGame = latestGame.current;
      if (endGame) {
        console.log('Unmount game');
        if (!endGame.disposed) endGame.dispose();
      }
    };
  }, []);

  return <canvas ref={canvas} id="game" />;
};
