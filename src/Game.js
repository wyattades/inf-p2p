import MainLoop from 'mainloop.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
// import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
// import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass';
// import { AfterimagePass } from 'three/examples/jsm/postprocessing/OutlinePass';
// import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect';

import ChunkLoader from 'src/ChunkLoader';
import Controls from 'src/Controls';
import Player from 'src/objects/Player';
import UI from 'src/ui';
import options from 'src/options';
import Sky from 'src/objects/Sky';
// import Vehicle from 'src/objects/Vehicle';
import * as GameState from 'src/GameState';
// import Client from 'src/Client';
// import { loadModel } from 'src/utils/models';
import Saver from 'src/Saver';
import FlyControls from 'src/FlyControls';
import physics, { loadPhysicsModule } from 'src/physics';

const $game = document.querySelector('canvas#game');

export default class Game {
  async preload() {
    await loadPhysicsModule();
  }

  init() {
    this.state = null;

    this.canvas = $game;

    this.ui = new UI(this);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.5,
      2000,
    );

    this.createScene();
    this.createRenderer();

    physics.init();

    // debug.enable(this.scene);

    this.chunkLoader = new ChunkLoader(this.scene, options.get('renderDist'));

    this.controls = new Controls(this);

    this.player = new Player(this);

    // this.vehicle = new Vehicle(this);

    this.createLights();

    this.saver = new Saver(
      () => this.player.position,
      (next) => this.player.setPos(next.x, next.y, next.z),
    );

    this.objectGroup = new THREE.Group();
    this.scene.add(this.objectGroup);

    // this.client = new Client(this.player);

    this.tick = 0;
    this.setTime(8);
    this.setState(GameState.LOADING);

    // Resize camera and renderer on window resize
    window.addEventListener('resize', this.resize);

    this.mainLoop = MainLoop.setUpdate((delta) => {
      try {
        this.update(1 / delta);
      } catch (err) {
        console.error('update error', err);
        this.setState(GameState.ERROR);
      }
    })
      .setDraw(this.render)
      .setEnd(this.updateEnd);
  }

  // Create world scene, add lights, skybox, and fog
  createScene() {
    this.scene = new THREE.Scene();

    // Fog
    this.scene.fog = options.get('fog')
      ? new THREE.FogExp2(0xe2f6ff, 0.007 / options.get('renderDist'))
      : null;

    // Sky box
    this.sky = new Sky();
    this.scene.add(this.sky);
  }

  createRenderer() {
    this.renderer?.dispose();
    this.effectComposer?.reset();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !!options.get('antialias'),
      canvas: this.canvas,
    });
    if (options.get('shadows')) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.BasicShadowMap;
    }
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // this.renderer = new OutlineEffect(this.renderer, {
    //   defaultThickness: 0.003,
    //   defaultColor: new THREE.Color(0xcccccc).toArray(),
    // });

    this.effectComposer = new EffectComposer(this.renderer);

    this.effectComposer.addPass(new RenderPass(this.scene, this.camera));

    // this.effectComposer.addPass(new SSAOPass(this.scene, this.camera));

    // this.effectComposer.addPass(new OutlineEffect(this.renderer));

    // const afterimagePass = new AfterimagePass(0.95);
    // this.effectComposer.addPass(afterimagePass);
  }

  render = () => {
    // this.renderer.render(this.scene, this.camera);
    this.effectComposer.render();
  };

  async reload() {
    try {
      this.dispose();
      this.init();
      await this.start();
    } catch (err) {
      console.error('reload error:', err);
      this.setState(GameState.ERROR);
    }
  }

  // Resize viewport
  // TODO: throttle this
  resize = () => {
    const w = window.innerWidth,
      h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  createLights() {
    this.hemiLight = new THREE.HemisphereLight(0x3284ff, 0xffc87f, 0.3);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff4e5, 1);

    // FIXME:
    // this.dirLight.castShadow = options.get('shadows');

    // const d = 50;
    // this.dirLight.shadow.camera.left = -d;
    // this.dirLight.shadow.camera.right = d;
    // this.dirLight.shadow.camera.top = d;
    // this.dirLight.shadow.camera.bottom = -d;

    // this.dirLight.shadow.camera.far = 3500;
    // this.dirLight.shadow.bias = -0.0001;

    if (options.get('debug'))
      this.scene.add(new THREE.CameraHelper(this.dirLight.shadow.camera));

    this.scene.add(this.dirLight);
  }

  setTime(hour) {
    this.time = hour % 24.0;
    const norm = hour / 24;
    const angle = -norm * 2 * Math.PI - Math.PI / 2;

    if (this.dirLight) {
      this.dirLight.position.set(Math.cos(angle), Math.sin(angle), 0);
      // .setLength(30);

      this.dirLight.intensity = Math.sin(angle);
    }

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

    this.ui.set('chunkX', this.chunkLoader.playerChunk.x.toString());
    this.ui.set('chunkZ', this.chunkLoader.playerChunk.z.toString());
  }

  async start() {
    await this.loadTerrain();
    // await this.vehicle.load();

    // Start the update and render loops
    this.mainLoop.start();

    this.controls.bindControls();

    this.controls.bindPress('toggleInfo', () => this.ui.toggleInfo());
    this.controls.bindPress('toggleMenu', () => {
      if (this.state === GameState.PAUSED) {
        // TODO: doesn't work b/c when user presses ESC:
        //       first, pointerlockchange is triggered. then immediately after, this callback is triggered
        // this.setState(GameState.PLAYING);
      } else if (this.state === GameState.PLAYING) {
        this.setState(GameState.PAUSED);
      }
    });
    this.controls.bindPress('toggleOrbit', () => {
      if (this.flyControls) {
        this.player.body.resetMovement();
        this.player.setPos(...this.flyControls.object.position.toArray());
        this.flyControls.dispose();
        this.flyControls = null;
      } else {
        this.flyControls = new FlyControls(this);
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

    // this.client.init();
    // this.client.once('connect', () => {
    //   loadModel(import('src/models/person.json'))
    //     .then((obj) => {
    //       obj.scale.setScalar(0.034);
    //       obj.rotateX(-Math.PI / 2);
    //       this.scene.add(obj);
    //       this.enemy = obj;

    //       this.client.on('update', this.enemyUpdate);
    //     })
    //     .catch(console.error);
    // });

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
            this.scene.fog = changed.fog
              ? new THREE.FogExp2(0xe2f6ff, 0.002)
              : null;
          } else if (key === 'antialias' || key === 'shadows') {
            this.createRenderer();
          }
        }
      }
      this.controls.lockPointer();
    } else if (newState === GameState.PAUSED) {
      this.controls.unlockPointer();
      this.mainLoop.stop();
    } else if (newState === GameState.ERROR) {
      this.controls.unlockPointer();
      this.mainLoop.stop();
    }

    UI.setMode(newState);

    this.ui.toggleMenu(newState === GameState.PAUSED); // TEMP
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

  cameraFollowPlayer(player) {
    this.camera.position.copy(player.position);
    this.camera.rotation.copy(player.object.rotation);
  }

  updateEnd = (fps, panic) => {
    this.ui.set('FPS', fps);

    if (panic) {
      // TODO
      const skipped = MainLoop.resetFrameDelta();
      console.warn('Skipped frames:', skipped);
    }
  };

  update(delta) {
    if (this.flyControls) {
      this.flyControls.update(delta * 20);
    } else {
      this.player?.update(delta, this.tick);
    }
    this.vehicle?.update(delta, this.tick);
    for (const obj of this.objectGroup.children) obj.update(delta, this.tick);

    // Physics
    physics.update(delta, this.tick);

    // spawn random box
    // if (this.tick % 120 === 0) {
    //   const pos = this.player.position.clone();

    //   const angle = Math.random() * Math.PI * 2;
    //   pos.x += Math.cos(angle) * 35;
    //   pos.y += 10;
    //   pos.z += Math.sin(angle) * 35;

    //   const box = new Box(pos);
    //   this.objectGroup.add(box.mesh);
    // }

    let followPosition = null;

    if (this.flyControls) {
      followPosition = this.flyControls.object.position;
    } else if (this.player) {
      this.cameraFollowPlayer(this.player);

      followPosition = this.player.position;
    } else if (this.vehicle) {
      this.cameraFollowVehicle(this.vehicle);

      followPosition = this.vehicle.position;
    }

    if (followPosition) {
      // Skybox follow position
      this.sky.position.set(followPosition.x, 0, followPosition.z);

      // Update chunk
      const { x: chunkX, z: chunkZ } = ChunkLoader.worldPosToChunk(
        followPosition.x,
        followPosition.z,
      );

      if (this.chunkLoader.updatePlayerChunk(chunkX, chunkZ)) {
        this.ui.set('chunkX', chunkX.toString());
        this.ui.set('chunkZ', chunkZ.toString());
      }

      if (this.tick % 5 === 0) {
        this.ui.set('x', followPosition.x);
        this.ui.set('y', followPosition.y);
        this.ui.set('z', followPosition.z);
      }
    }

    if (this.tick % 10 === 0) {
      this.setTime(this.time);

      this.ui.set('tick', this.tick.toString());
    }

    if (this.tick % 200 === 0 && window.navigator?.storage?.estimate) {
      navigator.storage.estimate().then(({ quota, usage }) => {
        this.ui.set(
          'storage',
          `${((usage / quota) * 100) | 0}% (${(usage / 1000000) | 0}/${
            (quota / 1000000) | 0
          } MB)`,
        );
      });
    }

    // const chunkX = halfChunkX * 2;
    // const chunkZ = halfChunkZ * 2;
    // this.chunkLoader.updatePhysicsChunks(halfChunkX, halfChunkZ);

    this.tick++;
    this.time += 0.001;
  }

  dispose() {
    // debug.disable();
    this.mainLoop.stop();
    this.player?.dispose();
    this.vehicle?.dispose();
    this.flyControls?.dispose();
    this.ui.dispose();
    this.chunkLoader.dispose();
    this.saver.dispose();
    this.scene.clear();
    this.client?.dispose();
    this.renderer.dispose();
    this.controls.unbindControls();
    physics.dispose();

    window.removeEventListener('resize', this.resize);
  }
}
