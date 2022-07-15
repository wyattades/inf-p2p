import { useGame, useGameState, useOptions } from 'lib/hooks/game';
import { OPTIONS } from 'src/options';
import { GameState } from 'src/GameState';
import { useSubscribe } from 'lib/hooks/useSubscribe';

// const formValues = (form: HTMLFormElement) => {
//   const vals: Record<string, string> = {};
//   for (const el of Array.from(form.elements) as HTMLInputElement[]) {
//     if (el.name != null && el.value != null) vals[el.name] = el.value;
//   }
//   return vals;
// };

const InfoInner = () => {
  const game = useGame();

  const debugStats = useSubscribe(game.ui!.events, 'update_stats', () => ({
    ...game.ui!.debugStats,
  }));

  return (
    <div id="info">
      {Object.entries(debugStats).map(([key, val]) => {
        return (
          <p key={key}>
            {key}: {val}
          </p>
        );
      })}
    </div>
  );
};

const Info = () => {
  const [{ show_ui: showing }] = useOptions();
  if (!showing) return null;

  return <InfoInner />;
};

const Menu = () => {
  const game = useGame();

  const [options, setOption] = useOptions();

  const isPaused = useGameState() === GameState.PAUSED;
  if (!isPaused) return null;

  return (
    <div id="menu">
      <p>Paused</p>
      <div id="options">
        {OPTIONS.map((opt) => {
          const type = opt.min == null ? 'checkbox' : 'range';

          const value = options[opt.key] ?? opt.default;

          return (
            <div key={opt.key}>
              {type === 'checkbox' ? (
                <label>
                  <input
                    type="checkbox"
                    checked={value as boolean}
                    onChange={(e) => setOption(opt.key, e.target.checked)}
                  />
                  {opt.label}
                </label>
              ) : (
                <label>
                  {opt.label}
                  <input
                    type="range"
                    min={opt.min}
                    max={opt.max}
                    value={value as number}
                    onChange={(e) => setOption(opt.key, e.target.valueAsNumber)}
                  />
                  {value}
                </label>
              )}
            </div>
          );
        })}
      </div>
      {/* <form
        id="p2p"
        onSubmit={(e) => {
          e.preventDefault();
          const { code } = formValues(e.target as HTMLFormElement);
          game.client?.onSubmit(code);
        }}
      >
        <textarea
          name="code"
          // TODO: this is hacky
          ref={(el) => {
            if (game.client) game.client.textEl = el;
          }}
        />
        <button type="submit">Connect</button>
      </form> */}
      <button
        id="resume"
        type="button"
        onClick={() => game.setState(GameState.PLAYING)}
      >
        Resume
      </button>
      <button
        id="clearMapCache"
        type="button"
        onClick={async () => {
          await game.chunkLoader?.clearMapCache();
          await game.setup();
        }}
      >
        Clear map cache
      </button>
    </div>
  );
};

export const StateOverlay: React.FC<{ gameState: GameState }> = ({
  gameState,
}) => {
  return gameState === GameState.LOADING ? (
    <div id="text-overlay">
      <p className="loader">Initializing world</p>
    </div>
  ) : gameState === GameState.ERROR ? (
    <div id="text-overlay">
      <p className="error">!!! ERROR !!!</p>
    </div>
  ) : null;
};

const ConnectedOverlay = () => {
  const gameState = useGameState();
  return <StateOverlay gameState={gameState} />;
};

export const UI: React.FC = () => {
  return (
    <>
      <Info />
      <Menu />
      <ConnectedOverlay />
    </>
  );
};
