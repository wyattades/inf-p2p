import * as THREE from 'three';

import { GameState } from 'src/GameState';
import EventManager from 'src/utils/EventManager';
import type Game from 'src/Game';

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

type KeyBindName = keyof typeof DEFAULT_KEYBINDS;

export default class Controls {
  rotation = new THREE.Vector2(0, 0);
  private canvas: HTMLCanvasElement;
  private keybinds: Record<number, KeyBindName> = {};
  keystate: Record<string, boolean> = {};
  private keyCallbacks: Record<string, () => void> = {};
  private em = new EventManager();

  constructor(readonly game: Game) {
    this.canvas = game.canvas;

    for (const bindName in DEFAULT_KEYBINDS) {
      this.setKeyBind(
        bindName as KeyBindName,
        DEFAULT_KEYBINDS[bindName as KeyBindName],
      );
    }
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

    // @ts-expect-error fallback
    this.canvas.requestPointerLock ||= this.canvas.mozRequestPointerLock;
    // @ts-expect-error fallback
    document.exitPointerLock ||= document.mozExitPointerLock;

    this.bindPointerLock(this.onPointerLockChange);
  }

  bindPointerLock(cb: () => void) {
    if ('onpointerlockchange' in document) {
      this.em.on(document, 'pointerlockchange', cb);
    } else if ('onmozpointerlockchange' in document) {
      this.em.on(document, 'mozpointerlockchange', cb);
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

  // disableNextPointLock = false;
  onPointerLockChange = () => {
    // if (this.disableNextPointLockAt) {
    //   this.disableNextPointLockAt = false;
    //   return;
    // }

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

  onMousemove = (evt: MouseEvent) => {
    if (this.game.state === GameState.PLAYING) {
      const sensitivity = this.game.options!.get('mouseSensitivity') / 3000;

      const mx = evt.movementX;
      let my = evt.movementY;

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

  allowKey(evt: KeyboardEvent) {
    if (evt.ctrlKey || evt.metaKey) return true;
    if (/^F\d+$/.test(evt.key)) return true; // allow F<N> keys
    return false;
  }

  onKeydown = (evt: KeyboardEvent) => {
    if (!this.allowKey(evt)) evt.preventDefault();

    const bindName = this.keybinds[evt.which];
    if (bindName) {
      this.keyCallbacks[bindName]?.();
      this.keystate[bindName] = true;
    }
  };

  onKeyup = (evt: KeyboardEvent) => {
    if (!this.allowKey(evt)) evt.preventDefault();

    const bindName = this.keybinds[evt.which];
    if (bindName) {
      this.keystate[bindName] = false;
    }
  };

  static KeyCodeMap: Record<string, number> = {
    Shift: 16,
    Control: 17,
    Escape: 27,
    ArrowUp: 38,
    ArrowDown: 40,
    ArrowLeft: 37,
    ArrowRight: 39,
  };
  setKeyBind(bindName: KeyBindName, keyCombo: string) {
    let which;
    if (keyCombo.length === 1) which = keyCombo.toUpperCase().charCodeAt(0);
    else if ((which = Controls.KeyCodeMap[keyCombo])) {
      // good
    } else throw new Error(`setKeyBind: invalid keyCombo ${keyCombo}`);

    this.keybinds[which] = bindName;
    this.keystate[bindName] = false;
  }

  pressed(bindName: KeyBindName) {
    return this.keystate[bindName] === true;
  }

  bindPress(bindName: KeyBindName, fn: () => void) {
    if (bindName in DEFAULT_KEYBINDS) {
      this.keyCallbacks[bindName] = fn;
    } else console.error('Invalid keybind action:', bindName);
  }

  clearPresses() {
    for (const bindName in this.keystate) {
      this.keystate[bindName] = false;
    }
  }

  unbindControls() {
    this.em.off();
    this.keystate = {};
    this.keyCallbacks = {};
  }
}
