import * as THREE from 'three';


// TODO seperate keyevents, player, and physics

export default class Player {
  
  constructor(app) {
    this.chunkLoader = app.chunkLoader;
    this.rotation = app.controls.rotation;
    this.keystate = app.controls.keystate;
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = false;
  }

  setPos(x, y, z) {
    this.position.set(x, y, z);
  }

  update(delta) {
    // Do we even need delta if it's constant?
    // TODO move constants
    delta = 1 / delta;
    const speed = delta * 1.1;
    const rotSpeed = delta * 1.2;
    const drag = 0.91; // TODO: Use slope
    const gravity = 0.03; // This doesn't work cause it's not linear... TODO
    const jumpSpeed = 0.6;
    const maxSpeed = 0.7;

    // Apply controls to motion
    const motion = new THREE.Vector3(0, 0, 0);
    if (this.keystate.forward) {
      motion.z -= speed;
    }
    if (this.keystate.backward) {
      motion.z += speed;
    }
    if (this.keystate.strafeLeft) {
      motion.x -= speed;
    }
    if (this.keystate.strafeRight) {
      motion.x += speed;
    }
    if (this.keystate.cameraUp) {
      this.rotation.x += rotSpeed;
    }
    if (this.keystate.cameraDown) {
      this.rotation.x -= rotSpeed;
    }
    if (this.keystate.cameraLeft) {
      this.rotation.y += rotSpeed;
    }
    if (this.keystate.cameraRight) {
      this.rotation.y -= rotSpeed;
    }
    if (this.onGround && this.keystate.jump) {
      this.velocity.y = jumpSpeed;
    }

    // apply rotation to motion
    const rotation = new THREE.Matrix4().makeRotationY(this.rotation.y);
    motion.applyMatrix4(rotation);

    // add acc and vel
    this.velocity.add(motion);
    this.position.add(this.velocity);

    // hit ground
    const playerHeight = 2.9;
    const groundHeight = this.chunkLoader.playerChunk.getHeightAt(this.position.x, this.position.z);
    const groundDist = this.position.y - playerHeight - groundHeight;
    this.onGround = groundDist <= 0;
    if (this.onGround) this.velocity.y = 0;
    if (groundDist < 0) this.position.y = groundHeight + playerHeight;

    // drag
    const velY = this.velocity.y;
    this.velocity.y = 0;
    if (groundDist < 0.5) {
      this.velocity.multiplyScalar(drag);
    }
    this.velocity.clampLength(-maxSpeed, maxSpeed);
    this.velocity.y = velY;

    // gravity
    this.velocity.y -= gravity;
  }

}
