import { Play } from 'components/Play';

const Menu = () => {
  return (
    <div id="menu" className="hidden">
      <p>Paused</p>
      <div id="options" />
      <form id="p2p">
        <textarea />
        <button type="submit">Connect</button>
      </form>
      <button id="resume" type="button">
        Resume
      </button>
      <button id="clearMapCache" type="button">
        Clear map cache
      </button>
    </div>
  );
};

export default function HomePage() {
  return (
    <div>
      <Play />
      <div id="info" />
      <Menu />

      <div id="text-overlay">
        <p className="loader">Initializing world</p>
        <p className="error hidden">!!! ERROR !!!</p>
      </div>
    </div>
  );
}
