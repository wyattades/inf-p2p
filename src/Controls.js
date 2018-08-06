import * as THREE from 'three';

import * as ui from './ui';


// Key constants
const K_FORWARD = 'W'.charCodeAt(0);
const K_BACKWARD = 'S'.charCodeAt(0);
const K_STRAFE_LEFT = 'A'.charCodeAt(0);
const K_STRAFE_RIGHT = 'D'.charCodeAt(0);
const K_JUMP = ' '.charCodeAt(0);

const K_UP = 38;
const K_DOWN = 40;
const K_LEFT = 37;
const K_RIGHT = 39;

export default class Controls {

  constructor(app) {
    this.app = app;
    this.position = new THREE.Vector3(0, 0, 0);
    this.rotation = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = false;
    this.keystate = {};
    this.bindEvents();
  }

  bindEvents() {
    // You can only request pointer lock from a user triggered event
    const el = document.querySelector('canvas');
    document.body.addEventListener('mousedown', () => {
      if (!el.requestPointerLock) {
        el.requestPointerLock = el.mozRequestPointerLock;
      }
      el.requestPointerLock();
    }, false);

    // Update rotation from mouse motion
    document.body.addEventListener('mousemove', (evt) => {
      const sensitivity = 0.002;
      this.rotation.x -= evt.movementY * sensitivity;
      this.rotation.y -= evt.movementX * sensitivity;
      // Constrain viewing angle
      if (this.rotation.x < -Math.PI / 2) {
        this.rotation.x = -Math.PI / 2;
      }
      if (this.rotation.x > Math.PI / 2) {
        this.rotation.x = Math.PI / 2;
      }
    }, false);

    // Update keystate from down/up events
    window.addEventListener('keydown', (evt) => {
      this.keystate[evt.which] = true;
    }, false);
    window.addEventListener('keyup', (evt) => {
      this.keystate[evt.which] = false;
    }, false);

  }

  update(delta) {
    const speed = delta * 2.2;
    const rotSpeed = delta * 1.2;
    const drag = 0.94; // TODO: Use slope
    const gravity = delta * 2.5; // This doesn't work cause it's not linear... TODO
    const jumpSpeed = 1.0;

    const motion = new THREE.Vector3(0, 0, 0);
    if (this.keystate[K_FORWARD]) {
      motion.z -= speed;
    }
    if (this.keystate[K_BACKWARD]) {
      motion.z += speed;
    }
    if (this.keystate[K_STRAFE_LEFT]) {
      motion.x -= speed;
    }
    if (this.keystate[K_STRAFE_RIGHT]) {
      motion.x += speed;
    }
    if (this.keystate[K_UP]) {
      this.rotation.x += rotSpeed;
    }
    if (this.keystate[K_DOWN]) {
      this.rotation.x -= rotSpeed;
    }
    if (this.keystate[K_LEFT]) {
      this.rotation.y += rotSpeed;
    }
    if (this.keystate[K_RIGHT]) {
      this.rotation.y -= rotSpeed;
    }
    if (this.onGround && this.keystate[K_JUMP]) {
      this.velocity.y = jumpSpeed;
    }

    const rotation = new THREE.Matrix4().makeRotationY(this.rotation.y);
    motion.applyMatrix4(rotation);
    this.velocity.add(motion);
    // const nextPosition = this.position.clone();
    // nextPosition.add(this.velocity);
    this.position.add(this.velocity);

    // drag
    this.velocity.x *= drag;
    this.velocity.z *= drag;
    // gravity
    this.velocity.y -= gravity;

    // let x = nextPosition.x;
    // let z = nextPosition.z;
    // const terrain = this.app.terrain;
    // // Constrain position to terrain bounds
    // if (x < 0 || x >= terrain.width - 1) {
    //   x = this.position.x;
    // }
    // if (z < 0 || z >= terrain.height - 1) {
    //   z = this.position.z;
    // }
    // this.position.x = x;
    // this.position.z = z;
    // this.position.y = nextPosition.y;
    // this.position.set(nextPosition);

    const playerHeight = 5;
    const groundHeight = this.app.chunkLoader.playerChunk.getHeightAt(this.position.x, this.position.z);
    const groundDist = this.position.y - playerHeight - groundHeight;
    this.onGround = groundDist <= 0;
    if (this.onGround) this.velocity.y = 0;
    if (groundDist < 0) this.position.y = groundHeight + playerHeight;

    // TEMP?
    ui.set('x', this.position.x);
    ui.set('y', this.position.y);
    ui.set('z', this.position.z);
    
    // Apply current transformations to camera
    const camera = this.app.camera;
    camera.position.copy(this.position);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(this.rotation.y);
    camera.rotateX(this.rotation.x);
  }

}
