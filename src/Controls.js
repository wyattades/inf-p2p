import * as THREE from 'three';

import options from 'src/options';
import * as GameState from 'src/GameState';
import EventManager from 'src/utils/EventManager';

// TODO gamepad support, cars???

const DEFAULT_KEYBINDS = {
  forward: 'w',
  strafeLeft: 'a',
  backward: 's',
  strafeRight: 'd',
  jump: ' ',
  sprint: 'Shift',
  crouch: 'Control',
  toggleMenu: 'Escape',
  toggleInfo: 'i',
  toggleOrbit: 't',
  flipCar: 'f',
  clearCache: 'p',
  toggleCamera: 'c',
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
      this.setKeyBind(bindName, DEFAULT_KEYBINDS[bindName]);
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

  onPointerLockChange = () => {
    if (!document.pointerLockElement) this.pauseFromPlaying();
  };

  onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') this.pauseFromPlaying();
  };

  onBlur = () => {
    this.pauseFromPlaying();
  };

  onMouseLeaveBody = () => {
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
    if (!/^F\d+$/.test(evt.key)) evt.preventDefault(); // allow F<N> keys

    const bindName = this.keybinds[evt.which];
    if (bindName) {
      const bind = this.keystate[bindName];
      if (typeof bind === 'function') bind();
      else this.keystate[bindName] = true;
    }
  };

  onKeyup = (evt) => {
    if (!/^F\d+$/.test(evt.key)) evt.preventDefault(); // allow F<N> keys

    const bindName = this.keybinds[evt.which];
    if (bindName) {
      const bind = this.keystate[bindName];
      if (typeof bind !== 'function') this.keystate[bindName] = false;
    }
  };

  static KeyCodeMap = {
    Shift: 16,
    Control: 17,
    Escape: 27,
    ArrowUp: 38,
    ArrowDown: 40,
    ArrowLeft: 37,
    ArrowRight: 39,
  };
  setKeyBind(bindName, key) {
    let which;
    if (key.length === 1) which = key.toUpperCase().charCodeAt(0);
    else if ((which = Controls.KeyCodeMap[key]));
    else throw new Error(`setKeyBind: invalid key ${key}`);

    this.keybinds[which] = bindName;
    this.keystate[bindName] = false;
  }

  // isKeyPressed(bindName) {
  //   return this.keystate[bindName] === true;
  // }

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
