import { memoize } from 'lodash-es';
import { EventEmitter } from 'events';
import MainLoop from 'mainloop.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
// import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
// import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass';
// import { AfterimagePass } from 'three/examples/jsm/postprocessing/OutlinePass';
// import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect';
// import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass';

import ChunkLoader from 'src/ChunkLoader';
import Chunk from 'src/Chunk';
import Controls from 'src/Controls';
import Player from 'src/objects/Player';
import UI from 'src/ui';
import { MAX_RENDER_DIST, Options } from 'src/options';
import Sky from 'src/objects/Sky';
// import Vehicle from 'src/objects/Vehicle';
import { GameState } from 'src/GameState';
import { SocketClient } from 'src/SocketClient';
import Saver from 'src/Saver';
import FlyControls from 'src/FlyControls';
import { Physics, loadPhysicsModule } from 'src/physics';
import { PlacementTool } from 'src/placementTool';
import type Vehicle from 'src/objects/Vehicle';

const SIMULATION_SPEED = 1000 / 60;

const canReadStorage = memoize(() => !!window.navigator?.storage?.estimate);

declare global {
  interface Window {
    GAME?: Game | null;
    CHEAT?: any;
  }
}

export default class Game {
  initialized = false;
  disposed?: boolean;
  events = new EventEmitter();

  state: GameState | null = null;
  physics!: Physics;
  chunkLoader!: ChunkLoader;
  controls!: Controls;
  options!: Options;
  camera!: THREE.PerspectiveCamera;
  ui!: UI;
  saver!: Saver;
  objectGroup!: THREE.Group;
  otherPlayerGroup!: THREE.Group;
  mainLoop!: MainLoop;
  socketClient!: SocketClient;

  player!: Player;
  flyControls: FlyControls | null = null;
  vehicle?: Vehicle | null;

  scene!: THREE.Scene;
  sky!: Sky;
  renderer!: THREE.WebGLRenderer;
  effectComposer!: EffectComposer;
  placementTool!: PlacementTool;

  constructor(readonly canvas: HTMLCanvasElement) {
    // add window hacks
    window.GAME = this;
    window.CHEAT = {
      setPos: (x: number, y: number, z: number) => {
        window.GAME?.player.setPos(x, y, z);
        window.GAME?.chunkLoader.updateFromFollower();
      },
      setTime: (hour: number) => window.GAME?.setTime(hour),
    };
  }

  async preload() {
    await loadPhysicsModule();
  }

  init() {
    this.options = new Options();

    this.ui = new UI();

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.5,
      Math.ceil(Math.sqrt(2) * MAX_RENDER_DIST * Chunk.SIZE),
    );

    this.createScene();
    this.createRenderer();

    this.physics = new Physics(this);

    // debug.enable(this.scene);

    this.chunkLoader = new ChunkLoader(this, this.options.get('renderDist'));

    this.controls = new Controls(this);

    this.player = new Player(this);

    this.placementTool = new PlacementTool(this);

    // this.vehicle = new Vehicle(this);

    this.createLights();

    // load player position, and start saving it on an interval
    this.saver = new Saver(
      () => this.player.position,
      (next) => {
        // add some extra `y` to avoid clipping through the ground
        this.player.setPos(next.x, next.y + 10, next.z);
      },
    );
    this.saver.start();

    this.objectGroup = new THREE.Group();
    this.scene.add(this.objectGroup);

    if (this.options.get('debug')) {
      this.scene.add(this.physics.debugMesh());
    }

    this.otherPlayerGroup = new THREE.Group();
    this.scene.add(this.otherPlayerGroup);

    this.socketClient = new SocketClient(this.otherPlayerGroup, this.player);

    this.tick = 0;
    this.setTime(8);

    // Resize camera and renderer on window resize
    window.addEventListener('resize', this.resize);

    this.mainLoop = MainLoop.setSimulationTimestep(SIMULATION_SPEED)
      .setUpdate((delta) => {
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

  createFog() {
    // if (this.scene.fog) this.scene.remove(this.scene.fog);

    this.scene.fog = this.options.get('fog')
      ? new THREE.FogExp2(0xe2f6ff, 0.007 / this.options.get('renderDist'))
      : null;
  }

  // Create world scene, add lights, skybox, and fog
  createScene() {
    this.scene = new THREE.Scene();

    this.createFog();

    // Sky box
    this.sky = new Sky();
    this.scene.add(this.sky);
  }

  createRenderer() {
    this.renderer?.dispose();
    this.effectComposer?.reset();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !!this.options.get('antialias'),
      canvas: this.canvas,
    });
    if (this.options.get('shadows')) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // this.renderer = new OutlineEffect(this.renderer, {
    //   defaultThickness: 0.003,
    //   defaultColor: new THREE.Color(0xcccccc).toArray(),
    // });

    this.effectComposer = new EffectComposer(this.renderer);

    this.effectComposer.addPass(new RenderPass(this.scene, this.camera));

    // this.effectComposer.addPass(
    //   new BokehPass(this.scene, this.camera, {
    //     focus: 0,
    //     aperture: 0.9,
    //     maxblur: 0.01,
    //     width: this.renderer.domElement.width,
    //     height: this.renderer.domElement.height,
    //   }),
    // );

    // this.effectComposer.addPass(new SSAOPass(this.scene, this.camera));

    // this.effectComposer.addPass(new OutlineEffect(this.renderer));

    // const afterimagePass = new AfterimagePass(0.95);
    // this.effectComposer.addPass(afterimagePass);
  }

  render = () => {
    // this.renderer.render(this.scene, this.camera);
    this.effectComposer.render();
  };

  async setup() {
    try {
      const reinitialized = this.initialized;
      if (reinitialized) this.dispose();
      this.initialized = true;
      this.disposed = false;

      this.state = null;
      this.setState(GameState.LOADING);

      await this.preload();
      await this.init();
      await this.start();

      if (reinitialized) this.events.emit('reinitialized');
    } catch (err) {
      console.error('setup error:', err);
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
    this.render();
  };

  hemiLight?: THREE.HemisphereLight;
  dirLight?: THREE.DirectionalLight;
  createLights() {
    if (this.hemiLight) {
      this.hemiLight.dispose();
      this.scene.remove(this.hemiLight);
    }
    if (this.dirLight) {
      this.dirLight.dispose();
      this.scene.remove(this.dirLight);
    }

    this.hemiLight = new THREE.HemisphereLight(0x3284ff, 0xffc87f, 0.3);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff4e5, 1);

    if (this.options.get('shadows')) {
      this.dirLight.castShadow = true;
      // this.dirLight.shadowCameraVisible = true;

      // the higher `size`, the higher definition the shadows
      const size = 2048;
      this.dirLight.shadow.mapSize.width = size;
      this.dirLight.shadow.mapSize.height = size;

      // how much area of the map the shadows are visible
      const d = 500;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;

      this.dirLight.shadow.camera.near = 0.5;
      this.dirLight.shadow.camera.far = 1000;

      // this.dirLight.shadow.radius = 1.0;
      // this.dirLight.shadow.bias = 0.001;
      // this.dirLight.shadow.blurSamples = 1;
      // this.dirLight.shadow.normalBias = 0.1;
    }

    if (this.options.get('debug'))
      this.scene.add(new THREE.CameraHelper(this.dirLight.shadow.camera));

    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target); // b/c we move this light around
  }

  time = 0;
  tick = 0;
  setTime(hour: number) {
    this.time = hour % 24.0;
    const norm = hour / 24;
    const angle = -norm * 2 * Math.PI - Math.PI / 2;

    if (this.dirLight) {
      // TODO: deduplicate logic
      const followPosition =
        this.flyControls?.object.position || this.player?.position;

      const offset = followPosition.clone();

      offset.x += Math.cos(angle) * 500;

      this.dirLight.position
        .set(Math.cos(angle), Math.sin(angle), 0)
        .add(offset);
      this.dirLight.target.position.copy(offset);

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
    this.chunkLoader.setFollower(this.player.position);
    await this.chunkLoader.loadInitial();

    // initialize physics objects by performing one step
    this.physics.update(1, 0);

    const heightAt = this.physics.getMaxHeightAt(
      this.player.position.x,
      this.player.position.z,
    );
    this.player.setPos(null, heightAt + 30, null);

    this.updatePositionStats(this.player.position);
  }

  followType: 'vehicle' | null = null;

  async start() {
    await this.loadTerrain();

    await this.socketClient.init();

    // Start the update and render loops
    this.mainLoop.start();

    this.controls.bindControls();

    this.controls.bindPress('toggleInfo', () =>
      this.options.set('showUi', !this.options.get('showUi')),
    );
    this.controls.bindPress('toggleMenu', () => {
      if (this.state === GameState.PAUSED) {
        // when user presses ESC: first, pointerlockchange is triggered. then immediately after, this callback is triggered
        // TODO doesn't work. this.disableNextPointLock = true;
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
    this.controls.bindPress('toggleCamera', () => {
      if (this.followType === 'vehicle') this.followType = null;
      else this.followType = 'vehicle';
    });
    this.controls.bindPress('flipCar', () => {
      this.vehicle?.flip();
    });
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
  setState(newState: GameState) {
    const oldState = this.state;

    this.state = newState;
    this.events.emit('set_game_state', newState);

    if (newState === GameState.PLAYING) {
      // On unpause:
      if (oldState === GameState.PAUSED) {
        this.mainLoop?.start();

        // Update game if options changed
        const changed = this.options?.checkChanged() || {};
        if (
          changed.renderDist != null ||
          changed.debug != null ||
          changed.shadows != null
        ) {
          this.setup();
          return;
        } else if (changed.fog != null) {
          this.createFog();
        } else if (changed.antialias != null) {
          this.createRenderer();
          // this.createLights();
        }
      }
      this.controls?.lockPointer();
    } else if (newState === GameState.PAUSED) {
      this.controls?.unlockPointer();
      this.mainLoop?.stop();
    } else if (newState === GameState.ERROR) {
      this.controls?.unlockPointer();
      this.mainLoop?.stop();
    }

    this.controls?.clearPresses();
  }

  // enemy?: THREE.Object3D;
  // enemyUpdate = (data) => {
  //   if (!this.enemy) return;

  //   if (!data) {
  //     console.warn('Bad data');
  //     return;
  //   }

  //   this.enemy.position.copy(data.position);
  //   this.enemy.position.y -= 3;
  //   this.enemy.rotation.z = data.rotation.y + Math.PI;
  // };

  relativeCameraOffset = new THREE.Vector3(0, 7, -10);
  cameraFollowVehicle(obj: Vehicle) {
    const cameraOffset = this.relativeCameraOffset
      .clone()
      .applyMatrix4(obj.matrixWorld);

    cameraOffset.y = obj.position.y + this.relativeCameraOffset.y;

    this.camera.position.lerp(cameraOffset, 0.1);

    const lookAtPos = obj.position.clone();
    lookAtPos.y += 4;
    this.camera.lookAt(lookAtPos);
  }

  cameraFollowPlayer(player: Player) {
    this.camera.position.copy(player.position);
    this.camera.rotation.copy(player.object.rotation);
  }

  updatePositionStats(position: Point3) {
    const { x: chunkX, z: chunkZ } = ChunkLoader.worldPosToChunk(
      position.x,
      position.z,
    );

    this.ui.set('chunkX', chunkX);
    this.ui.set('chunkZ', chunkZ);
    this.ui.set('x', position.x.toFixed(2));
    this.ui.set('y', position.y.toFixed(2));
    this.ui.set('z', position.z.toFixed(2));
  }

  updateEnd = (fps: number, panic: boolean) => {
    this.ui.set('FPS', Math.round(fps));

    if (panic) {
      // TODO
      const skipped = MainLoop.resetFrameDelta();
      console.warn('Skipped frames:', skipped);
    }
  };

  update(delta: number) {
    if (this.flyControls) {
      this.flyControls.update(delta, this.tick);
    } else {
      this.player?.update(delta, this.tick);
    }
    this.vehicle?.update(delta, this.tick);
    for (const obj of this.objectGroup.children) {
      // @ts-expect-error TODO better way to iterate objects
      obj.gameObject?.update(delta, this.tick);
    }

    this.placementTool.update(delta, this.tick);

    // Physics
    this.physics.update(delta, this.tick);

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

    if (this.followType === 'vehicle' && this.vehicle) {
      this.cameraFollowVehicle(this.vehicle);

      followPosition = this.vehicle.position;
    } else if (this.flyControls) {
      followPosition = this.flyControls.object.position;
    } else if (this.player) {
      this.cameraFollowPlayer(this.player);

      followPosition = this.player.position;
    }

    this.chunkLoader.setFollower(followPosition);

    if (followPosition) {
      // Skybox follow position
      this.sky.position.set(
        followPosition.x,
        this.sky.position.y,
        followPosition.z,
      );

      // if (this.dirLight) {
      //   const shadowCamera = this.dirLight;
      //   shadowCamera.position.x = followPosition.x;
      //   // pos.y = followPosition.y;
      //   shadowCamera.position.z = followPosition.z;
      //   // shadowCamera.updateMatrix();
      // }

      // update chunks if needed
      this.chunkLoader.updateFromFollower();

      // update UI stats
      if (this.tick % 5 === 0) {
        this.updatePositionStats(followPosition);
      }
    }

    if (this.tick % 10 === 0) {
      this.setTime(this.time);

      this.ui.set('tick', this.tick);
    }

    if (this.tick % 5 === 0 && this.options.get('debug')) {
      this.physics.debugMesh(); // just updates the geometry
    }

    if (this.tick % 200 === 0 && canReadStorage()) {
      // console.log(this.renderer.info.memory.geometries);
      navigator.storage.estimate().then(({ quota, usage }) => {
        if (quota && usage) {
          this.ui.set(
            'storage',
            `${((usage / quota) * 100) | 0}% (${(usage / 1000000) | 0}/${
              (quota / 1000000) | 0
            } MB)`,
          );
        }
      });
    }

    this.tick++;
    this.time += 0.001;
  }

  dispose() {
    if (this.disposed) return console.warn('Game already disposed!');

    this.disposed = true;

    // debug.disable();
    this.mainLoop?.stop();
    this.player?.dispose();
    this.vehicle?.dispose();
    this.flyControls?.dispose();
    this.flyControls = null;
    this.ui?.dispose();
    this.chunkLoader?.dispose();
    this.saver?.dispose();
    this.scene?.clear();
    this.objectGroup?.clear();
    this.otherPlayerGroup?.clear();
    this.socketClient?.dispose();
    this.renderer?.dispose();
    this.controls?.unbindControls();
    this.physics?.dispose();

    if (window.GAME === this) window.GAME = null;

    // we need to listen to `reinitialized` event
    // this.events.removeAllListeners();

    window.removeEventListener('resize', this.resize);
  }
}
