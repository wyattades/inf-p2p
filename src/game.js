import * as THREE from 'three';
import MainLoop from 'mainloop.js';

import ChunkLoader from './ChunkLoader';
import Chunk from './Chunk';
import Controls from './Controls';
import * as ui from './ui';
import * as options from './options';
import * as save from './save';

// TODO: this file is kind of a mess

class App {

  constructor() {
    
    // Get window properties
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
      antialias: options.get('antialias'),
      canvas,
    });
    this.renderer.shadowMap.enabled = options.get('shadows');
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);

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
    MainLoop.setUpdate(this.update).setDraw(this.render).setEnd(this.updateEnd).start();
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
      
      ui.set('chunkX', this.chunkLoader.playerChunk.x);
      ui.set('chunkZ', this.chunkLoader.playerChunk.z);
    }
  }

  render = () => {
    this.renderer.render(this.scene, this.camera);
  }
}


export const init = () => {
  const app = new App();

  // Let there be light
  const ambientLight = new THREE.AmbientLight(0xfff9b2, 0.1);
  app.scene.add(ambientLight);

  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(0.5, 1, 0).normalize();
  light.castShadow = options.get('shadows');
  app.scene.add(light);

  // const light2 = new THREE.DirectionalLight(0xffcccc, 0.2);
  // light2.position.set(-1, 1, 1).normalize();
  // app.scene.add(light2);


  // Fog
  if (options.get('fog')) {
    const fog = new THREE.FogExp2(0x8cb8ff, 0.002);
    app.scene.fog = fog;
    app.renderer.setClearColor(fog.color, 0.5);
  }

  // first person controls
  const controls = new Controls(app);
  save.init(controls.position);

  const chunkLoader = new ChunkLoader(app.scene, options.get('renderDist'));
  chunkLoader.loadInitial(controls.position.x, controls.position.z).then(() => {

    document.getElementById('loader').remove();

    ui.key('1', () => {
      console.log('Cleared chunk cache');
      chunkLoader.clearCache();
    });

    ui.set('chunkX', chunkLoader.playerChunk.x);
    ui.set('chunkZ', chunkLoader.playerChunk.z);

    app.chunkLoader = chunkLoader;
    app.controls = controls;

    app.start();
    controls.bindEvents();
  })
  .catch(console.error);
};
