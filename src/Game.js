import * as THREE from 'three';
import MainLoop from 'mainloop.js';

import ChunkLoader from './ChunkLoader';
import Controls from './Controls';
import Player from './objects/Player';
import * as ui from './ui';
import * as options from './options';
import Sky from './objects/Sky';
// import Vehicle from './objects/Vehicle';
import * as GameState from './GameState';
import Client from './Client';
import { loadModel } from './utils/models';
// import * as physics from './physics';
// import * as debug from './debug';
import Saver from './Saver';

const $game = document.getElementById('game');
const $loader = document.getElementById('loader');

export default class Game {
  constructor() {
    this.init();
  }

  init() {
    this.state = null;

    this.canvas = $game;

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.5,
      2000,
    );

    this.createScene();
    this.createRenderer();
    // physics.createWorld();

    // debug.enable(this.scene);

    this.tick = 0;
    this.time = 10;
    this.setTime(this.time);

    this.chunkLoader = new ChunkLoader(this.scene, options.get('renderDist'));

    this.controls = new Controls(this);
    this.player = new Player(this);
    this.saver = new Saver(this.player.position);

    // this.vehicle = new Vehicle(
    //   this.scene,
    //   /* this.saver.pos || */ new THREE.Vector3(0, 10, 0),
    // );

    this.client = new Client(this.player);

    this.setState(GameState.LOADING);

    // Resize camera and renderer on window resize
    window.addEventListener('resize', this.resize);

    this.mainLoop = MainLoop.setUpdate(this.update)
      .setDraw(this.render)
      .setEnd(this.updateEnd);
  }

  // Create world scene, add lights, skybox, and fog
  createScene() {
    this.scene = new THREE.Scene();

    // Lights

    this.hemiLight = new THREE.HemisphereLight(0x3284ff, 0xffc87f, 0.7);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff4e5, 1);
    this.dirLight.castShadow = options.get('shadows');
    this.scene.add(this.dirLight);

    // Fog
    this.scene.fog = options.get('fog')
      ? new THREE.FogExp2(0xe2f6ff, 0.007 / options.get('renderDist'))
      : null;

    // Sky box
    this.sky = new Sky();
    this.scene.add(this.sky);
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: !!options.get('antialias'),
      canvas: this.canvas,
    });
    this.renderer.shadowMap.enabled = options.get('shadows');
    // this.renderer.gammaInput = true;
    // this.renderer.gammaOutput = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  reload() {
    this.dispose();
    this.init();
    this.start().catch((err) => {
      console.error(err);
      this.setState(GameState.ERROR);
    });
  }

  // Resize viewport
  resize = () => {
    const w = window.innerWidth,
      h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  setTime(hour) {
    this.time = hour % 24.0;
    const norm = hour / 24;
    const angle = -norm * 2 * Math.PI - Math.PI / 2;
    this.dirLight.position.set(Math.cos(angle), Math.sin(angle), 0).normalize();
    this.dirLight.intensity = Math.sin(angle);
    this.sky.setSunPos(0, norm + 0.75);
    if (this.scene.fog)
      this.scene.fog.color.setHSL(
        0,
        0,
        Math.max(Math.sin(Math.PI * norm), 0.45) - 0.35,
      );
  }

  async loadTerrain() {
    const { x, z } = this.player.position;
    await this.chunkLoader.loadInitial(x, z);

    const heightAt = this.chunkLoader.getHeightAt(x, z);
    this.player.setPos(null, heightAt + 30, null);

    ui.set('chunkX', this.chunkLoader.playerChunk.x.toString());
    ui.set('chunkZ', this.chunkLoader.playerChunk.z.toString());
  }

  async start() {
    await this.loadTerrain();
    // await this.vehicle.load();

    // Start the update and render loops
    this.mainLoop.start();

    this.controls.bindControls();

    this.controls.bindPress('toggleInfo', ui.toggleInfo);
    this.controls.bindPress('toggleMenu', () => {
      if (this.state === GameState.PAUSED) {
        // TODO not working
        setTimeout(() => {
          if (this.state === GameState.PAUSED) this.setState(GameState.PLAYING);
        }, 200);
      } else if (this.state === GameState.PLAYING) {
        this.setState(GameState.PAUSED);
      }
    });
    // this.controls.bindPress('flipCar', () => {
    //   this.vehicle.flip();
    // });
    // loadModel('person')
    // .then((obj) => {
    //   obj.scale.setScalar(0.034);
    //   obj.rotateX(-Math.PI / 2);
    //   obj.position.set(-100, -0, 66);
    //   this.scene.add(obj);
    // });

    this.client.init();
    this.client.once('connect', () => {
      loadModel(import('src/models/person.json'))
        .then((obj) => {
          obj.scale.setScalar(0.034);
          obj.rotateX(-Math.PI / 2);
          this.scene.add(obj);
          this.enemy = obj;

          this.client.on('update', this.enemyUpdate);
        })
        .catch(console.error);
    });

    this.setState(GameState.PLAYING);
  }

  // TODO: Fancier state transitions?
  setState(newState) {
    const oldState = this.state;

    this.state = newState;

    if (newState === GameState.PLAYING) {
      // On unpause:
      if (oldState === GameState.PAUSED) {
        this.mainLoop.start();
        // Update game if options changed
        const changed = options.checkChanged();
        for (const key in changed) {
          if (key === 'renderDist' || key === 'debug') {
            this.reload();
            return;
          } else if (key === 'fog') {
            this.scene.fog = changed[key]
              ? new THREE.FogExp2(0xe2f6ff, 0.002)
              : null;
          } else if (key === 'antialias' || key === 'shadows') {
            this.renderer.dispose();
            this.createRenderer();
          }
        }
      }
      if (this.canvas.requestPointerLock) this.canvas.requestPointerLock();
    } else if (newState === GameState.PAUSED) {
      if (document.exitPointerLock) document.exitPointerLock();
      this.mainLoop.stop();
    }

    $loader.classList[newState === GameState.LOADING ? 'remove' : 'add'](
      'hidden',
    );
    ui.setActiveMenu(newState === GameState.PAUSED); // TEMP
    this.controls.clearPresses();
  }

  enemyUpdate = (data) => {
    if (!this.enemy) return;

    if (!data) {
      console.warn('Bad data');
      return;
    }

    this.enemy.position.copy(data.position);
    this.enemy.position.y -= 3;
    this.enemy.rotation.z = data.rotation.y + Math.PI;
  };

  relativeCameraOffset = new THREE.Vector3(0, 7, -10);
  cameraFollowVehicle(obj) {
    const cameraOffset = this.relativeCameraOffset
      .clone()
      .applyMatrix4(obj.matrixWorld);

    cameraOffset.y = obj.position.y + this.relativeCameraOffset.y;

    this.camera.position.lerp(cameraOffset, 0.1);

    const lookAtPos = obj.position.clone();
    lookAtPos.y += 4;
    this.camera.lookAt(lookAtPos);
  }

  cameraFollowPlayer(obj) {
    this.camera.position.copy(obj.position);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(obj.rotation.y);
    this.camera.rotateX(obj.rotation.x);
  }

  updateEnd = (fps, panic) => {
    ui.set('FPS', fps);

    if (panic) {
      // TODO
      const skipped = MainLoop.resetFrameDelta();
      console.warn('Skipped frames:', skipped);
    }
  };

  update = (delta) => {
    delta = 1 / delta;

    this.tick++;
    this.time += 0.001;

    // Physics
    // if (this.state === GameState.PLAYING)
    this.player.updateControls(delta);
    this.player.update(delta);
    // this.vehicle.update(delta);
    // physics.update(delta);

    if (this.tick % 5 === 0) {
      this.setTime(this.time);

      ui.set('x', this.player.position.x);
      ui.set('y', this.player.position.y);
      ui.set('z', this.player.position.z);
    }

    // this.camera.position.copy(this.player.position);
    // this.camera.rotation.set(0, 0, 0);
    // this.camera.rotateY(this.player.rotation.y);
    // this.camera.rotateX(this.player.rotation.x);

    // third persons
    this.cameraFollowPlayer(this.player);

    // Skybox follow player
    this.sky.position.set(this.player.position.x, 0, this.player.position.z);

    // Update chunk
    const { x: chunkX, z: chunkZ } = ChunkLoader.worldPosToChunk(
      this.player.position.x,
      this.player.position.z,
    );

    if (this.chunkLoader.updatePlayerChunk(chunkX, chunkZ)) {
      ui.set('chunkX', chunkX.toString());
      ui.set('chunkZ', chunkZ.toString());
    }

    // const chunkX = halfChunkX * 2;
    // const chunkZ = halfChunkZ * 2;
    // this.chunkLoader.updatePhysicsChunks(halfChunkX, halfChunkZ);
  };

  render = () => {
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    // debug.disable();
    physics.dispose();
    this.saver.dispose();
    this.client.dispose();
    this.renderer.dispose();
    this.controls.unbindControls();
    window.removeEventListener('resize', this.resize);
  }
}
