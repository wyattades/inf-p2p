import * as THREE from 'three';

import options from 'src/options';
import * as GameState from 'src/GameState';
import EventManager from 'src/utils/EventManager';

// TODO gamepad support, cars???

const DEFAULT_KEYBINDS = {
  forward: 87, // w
  strafeLeft: 65, // a
  backward: 83, // s
  strafeRight: 68, // d
  // cameraUp: 38, // ARROW_UP
  // cameraDown: 40, // ARROW_DOWN
  // cameraLeft: 37, // ARROW_LEFT
  // cameraRight: 39, // ARROW_RIGHT
  jump: 32, // SPACE
  toggleMenu: 27, // ESC
  toggleInfo: 73, // i
  flipCar: 70, // f
  clearCache: 80, // p
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

    this.em = new EventManager();
  }

  pauseFromPlaying() {
    if (this.game.state === GameState.PLAYING) {
      this.game.setState(GameState.PAUSED);
    }
  }

  bindControls() {
    // You can only request pointer lock from a user triggered event
    this.em.on(this.canvas, 'mousedown', this.onMousedown);

    // Update rotation from mouse motion
    this.em.on(this.canvas, 'mousemove', this.onMousemove);

    // Update keystate from down/up events
    this.em.on(window, 'keydown', this.onKeydown);
    this.em.on(window, 'keyup', this.onKeyup);

    // Clear controls when leaving window
    this.em.on(window, 'blur', this.onBlur);
    this.em.on(document, 'blur', this.onVisibilityChange);
    this.em.on(document.body, 'mouseleave', this.onMouseLeaveBody);

    this.canvas.requestPointerLock ||= this.canvas.mozRequestPointerLock;
    document.exitPointerLock ||= document.mozExitPointerLock;

    this.bindPointerLock('on', this.onPointerLockChange);
  }

  bindPointerLock(action, cb) {
    if ('onpointerlockchange' in document) {
      this.em[action](document, 'pointerlockchange', cb);
    } else if ('onmozpointerlockchange' in document) {
      this.em[action](document, 'mozpointerlockchange', cb);
    }
  }

  unlockPointer() {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  lockPointer() {
    if (!document.pointerLockElement) {
      this.canvas.requestPointerLock?.();
    }
  }

  onPointerLockChange = (e) => {
    if (!document.pointerLockElement) this.pauseFromPlaying();
  };

  onVisibilityChange = (e) => {
    if (document.visibilityState !== 'visible') this.pauseFromPlaying();
  };

  onBlur = (e) => {
    this.pauseFromPlaying();
  };

  onMouseLeaveBody = (e) => {
    this.pauseFromPlaying();
  };

  onMousedown = () => {
    if (this.game.state === GameState.PAUSED)
      this.game.setState(GameState.PLAYING);
    else if (this.game.state === GameState.PLAYING) this.lockPointer();
  };

  onMousemove = (evt) => {
    if (this.game.state === GameState.PLAYING) {
      const sensitivity = options.get('mouseSensitivity') / 3000;

      let mx = evt.movementX,
        my = evt.movementY;

      if (my === 1 && mx === 0) my = 0; // fixes mouse moving on its own on Windows 10 Firefox

      this.rotation.x -= my * sensitivity;
      this.rotation.y -= mx * sensitivity;

      // Constrain viewing angle
      if (this.rotation.x < -Math.PI / 2) {
        this.rotation.x = -Math.PI / 2;
      }
      if (this.rotation.x > Math.PI / 2) {
        this.rotation.x = Math.PI / 2;
      }
    }
  };

  onKeydown = (evt) => {
    const bindName = this.keybinds[evt.which];
    if (bindName) {
      const bind = this.keystate[bindName];
      if (typeof bind === 'function') bind();
      else this.keystate[bindName] = true;
    }
  };

  onKeyup = (evt) => {
    const bindName = this.keybinds[evt.which];
    if (bindName) {
      const bind = this.keystate[bindName];
      if (typeof bind !== 'function') this.keystate[bindName] = false;
    }
  };

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
    this.em.off();
  }
}
