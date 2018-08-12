import * as THREE from 'three';
import MainLoop from 'mainloop.js';

import ChunkLoader from './ChunkLoader';
import Chunk from './Chunk';
import Controls from './Controls';
import * as ui from './ui';

// TODO: this file is kind of a mess

class App {

  constructor() {
    // Grab window properties
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio;
    const aspect = width / height;
    // Setup three.js
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 1500);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xadd0ff);

    const canvas = document.getElementById('game');
    canvas.onblur = () => {
      // Stop moving!
      console.log('Blurred!');
    };

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      canvas,
    });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
    // document.body.appendChild(this.renderer.domElement);

    // Catch resize events
    window.onresize = () => {
      this.resize(window.innerWidth, window.innerHeight);
    };
  }

  // Resize viewport
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Start the main loop
  start() {
    // this.loop();

    MainLoop.setUpdate(this.update).setDraw(this.render).setEnd(this.updateEnd).start();

    setInterval(() => {
      ui.set('FPS', MainLoop.getFPS()); // 1 / this.frameTime
    }, 1000);

  }

  // frameTime = 0;

  // loop() {
  //   requestAnimationFrame(() => this.loop());

  //   const time = performance.now() / 1000;
  //   const delta = time - (this.lastUpdate || 0);
  //   this.frameTime += (delta - this.frameTime) / 20;

  //   this.update(delta);
  //   this.lastUpdate = time;
  //   this.render();
  // }

  updateEnd = (fps, panic) => {
    ui.set('FPS', fps);

    if (panic) {
      const x = MainLoop.resetFrameDelta();
      console.warn('Skipped frames:', x);
    }
  }

  update = (delta) => {
    this.controls.update(delta);

    const chunkX = Math.floor(this.controls.position.x / Chunk.SIZE);
    const chunkZ = Math.floor(this.controls.position.z / Chunk.SIZE);
    if (chunkX !== this.chunkLoader.playerChunk.x || chunkZ !== this.chunkLoader.playerChunk.z) {
      this.chunkLoader.updatePlayerChunk(chunkX, chunkZ);
      ui.set('chunk', `${this.chunkLoader.playerChunk.x},${this.chunkLoader.playerChunk.z}`);
    }
  }

  render = () => {
    const scene = this.scene;
    const camera = this.camera;
    const renderer = this.renderer;
    renderer.render(scene, camera);
  }
}


export const init = () => {
  const app = new App();

  // Let there be light
  const ambientLight = new THREE.AmbientLight(0x000000);
  app.scene.add(ambientLight);

  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(1, 1, 0).normalize();
  app.scene.add(light);

  const light2 = new THREE.DirectionalLight(0xffcccc, 0.2);
  light2.position.set(-1, 1, 1).normalize();
  app.scene.add(light2);


  // Fog
  const fog = new THREE.FogExp2(0x8cb8ff, 0.0009);
  app.scene.fog = fog;
  app.renderer.setClearColor(fog.color, 1);

  // TODO: save somewhere
  const spawn = {
    x: 50000,
    z: -600,
  };

  // first person controls
  const controls = new Controls(app);
  controls.position.set(spawn.x, 200.0, spawn.z);

  const renderDist = 1;
  const chunkLoader = new ChunkLoader(app.scene, spawn, renderDist);
  chunkLoader.loadInitial().then(() => {

    document.getElementById('loader').remove();

    ui.key('1', () => {
      console.log('Cleared chunk cache');
      chunkLoader.clearCache();
    });

    ui.set('chunk', `${chunkLoader.playerChunk.x},${chunkLoader.playerChunk.z}`);

    app.chunkLoader = chunkLoader;
    app.controls = controls;

    app.start();
    controls.bindEvents();
  })
  .catch(console.error);
};
