import * as THREE from 'three';
import * as options from './options';
import * as GameState from './GameState';


// TODO gamepad support, cars???

const DEFAULT_KEYBINDS = {
  forward: 87, // w
  strafeLeft: 65, // a
  backward: 83, // s
  strafeRight: 68, // d
  cameraUp: 38, // ARROW_UP
  cameraDown: 40, // ARROW_DOWN
  cameraLeft: 37, // ARROW_LEFT
  cameraRight: 39, // ARROW_RIGHT
  jump: 32, // SPACE
  toggleMenu: 27, // ESC
  toggleInfo: 73, // i
};

export default class Controls {

  constructor(game) {
    this.game = game;

    this.rotation = new THREE.Vector2(0, 0);

    this.canvas = document.getElementById('game');

    // TODO save in localStorage
    this.keybinds = {};
    
    this.keystate = {};
    for (const bindName in DEFAULT_KEYBINDS) {
      const key = DEFAULT_KEYBINDS[bindName];
      this.keybinds[key] = bindName;
      this.keystate[bindName] = false;
    }
  }

  bindControls() {
    // You can only request pointer lock from a user triggered event
    this.canvas.addEventListener('mousedown', this.onMousedown, false);

    // Update rotation from mouse motion
    this.canvas.addEventListener('mousemove', this.onMousemove, false);

    // Update keystate from down/up events
    window.addEventListener('keydown', this.onKeydown, false);
    window.addEventListener('keyup', this.onKeyup, false);

    // Clear controls when leaving window
    window.addEventListener('blur', this.onBlur, false);

    this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock;
    document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
    if ('onpointerlockchange' in document) {
      document.addEventListener('pointerlockchange', this.onPointerLockChange);
    } else if ('onmozpointerlockchange' in document) {
      document.addEventListener('mozpointerlockchange', this.onPointerLockChange);
    }
  }

  onPointerLockChange = () => {
    setTimeout(() => {
      const playing = this.game.state === GameState.PLAYING;
      const escaping = !document.pointerLockElement;
      if (playing && escaping) this.game.setState(GameState.PAUSED);
    });
  }

  onBlur = () => {
    this.game.setState(GameState.PAUSED);
  }

  onMousedown = () => {
    this.game.setState(GameState.PLAYING);
  }

  onMousemove = (evt) => {
    if (this.game.state === GameState.PLAYING) {
      const sensitivity = options.get('mouseSensitivity') / 1000;
      this.rotation.x -= evt.movementY * sensitivity;
      this.rotation.y -= evt.movementX * sensitivity;
      // Constrain viewing angle
      if (this.rotation.x < -Math.PI / 2) {
        this.rotation.x = -Math.PI / 2;
      }
      if (this.rotation.x > Math.PI / 2) {
        this.rotation.x = Math.PI / 2;
      }
    }
  }

  onKeydown = (evt) => {
    const bindName = this.keybinds[evt.which];
    if (bindName) {
      const bind = this.keystate[bindName];
      if (typeof bind === 'function') bind();
      else this.keystate[bindName] = true;
    }
  }

  onKeyup = (evt) => {
    const bindName = this.keybinds[evt.which];
    if (bindName) {
      const bind = this.keystate[bindName];
      if (typeof bind !== 'function') this.keystate[bindName] = false;
    }
  }

  setKeyBind(bindName, key) {
    this.keybinds[bindName] = key;
  }

  bindPress(bindName, fn) {
    if (bindName in DEFAULT_KEYBINDS) {
      this.keystate[bindName] = fn;
    } else console.error('Invalid keybind action:', bindName);
  }

  clearPresses() {
    for (const bindName in this.keystate) {
      if (typeof this.keystate[bindName] !== 'function')
        this.keystate[bindName] = false;
    }
  }

  unbindControls() {
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('keyup', this.onKeyup);
    this.canvas.removeEventListener('mousemove', this.onMousemove);
    this.canvas.removeEventListener('mousedown', this.onMousedown);
    if ('onpointerlockchange' in document) {
      document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    } else if ('onmozpointerlockchange' in document) {
      document.removeEventListener('mozpointerlockchange', this.onPointerLockChange);
    }
  }

}
