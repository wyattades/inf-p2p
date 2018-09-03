import * as THREE from 'three';
import MainLoop from 'mainloop.js';

import ChunkLoader from './ChunkLoader';
import Chunk from './Chunk';
import Controls from './Controls';
import * as ui from './ui';
import * as options from './options';
import * as save from './save';
import Sky from './Sky';


// TODO: this file is kind of a mess

class App {

  constructor() {

    this.canvas = document.getElementById('game');

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 2000);
    this.createScene();
    this.createRenderer();

    window.onblur = () => {
      this.controls.clearPresses();
    };

    // Catch resize events
    window.onresize = () => {
      this.resize(window.innerWidth, window.innerHeight);
    };
  }

  // Create world scene, add lights, skybox, and fog
  createScene() {
    this.scene = new THREE.Scene();

    // this.scene.background = new THREE.Color(0xffffff); // 0x99cbfa

    // Let there be light
    // const ambientLight = new THREE.AmbientLight(0xfff9b2, 0.1);
    // this.scene.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(0x3284ff, 0xffc87f, 0.6);
    hemiLight.position.set(0, 50, 0);
    this.hemiLight = hemiLight;
    this.scene.add(hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff4e5, 1);
    this.dirLight.castShadow = options.get('shadows');
    this.scene.add(this.dirLight);

    // Fog
    if (options.get('fog')) {
      this.scene.fog = new THREE.FogExp2(0xe2f6ff, 0.002); // options.get('renderDist') * Chunk.SIZE);
      // this.scene.fog = new THREE.Fog(0xffffff, 1, 1000); // options.get('renderDist') * Chunk.SIZE);
      // this.renderer.setClearColor(fog.color, 0.5);
    }

    this.sky = new Sky();

    this.scene.add(this.sky);

    this.setTime(10);
  }

  createRenderer() {
    if (this.renderer) this.renderer.dispose();

    this.renderer = new THREE.WebGLRenderer({
      antialias: options.get('antialias'),
      canvas: this.canvas,
    });
    this.renderer.shadowMap.enabled = options.get('shadows');
    // this.renderer.gammaInput = true;
    // this.renderer.gammaOutput = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Resize viewport
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setTime(hour) {
    const norm = hour / 24;
    const angle = -norm * 2 * Math.PI - Math.PI / 2;
    this.dirLight.position.set(Math.cos(angle), Math.sin(angle), 0).normalize();
    this.sky.setSunPos(0, norm + 0.75);
  }

  // Start the update and render loops
  start() {
    MainLoop.setUpdate(this.update).setDraw(this.render).setEnd(this.updateEnd).start();
  }

  updateEnd = (fps, panic) => {
    ui.set('FPS', fps);

    if (panic) {
      const x = MainLoop.resetFrameDelta();
      console.warn('Skipped frames:', x);
    }
  }

  update = (delta) => {
    this.controls.update(delta);

    this.sky.position.set(this.controls.position.x, 0, this.controls.position.z);

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

  // First-person controls
  app.controls = new Controls(app);

  window.cheat = {
    setPos: (x, y, z) => app.controls.position.set(x, y, z),
    setTime: app.setTime.bind(app),
    setOption: (key, val) => options.set(key, val),
  };

  // Initiate save manager
  save.init(app.controls.position);

  app.chunkLoader = new ChunkLoader(app.scene, options.get('renderDist'));
  app.chunkLoader.loadInitial(app.controls.position.x, app.controls.position.z).then(() => {

    // Remove loading pae
    document.getElementById('loader').remove();

    ui.set('chunkX', app.chunkLoader.playerChunk.x);
    ui.set('chunkZ', app.chunkLoader.playerChunk.z);

    app.start();
    app.controls.bindEvents();
  })
  .catch(console.error);
};

export const hotReload = () => {
  
};
