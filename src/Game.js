import * as THREE from 'three';
import MainLoop from 'mainloop.js';

import ChunkLoader from './ChunkLoader';
import Chunk from './Chunk';
import Controls from './Controls';
import Player from './Player';
import * as ui from './ui';
import * as options from './options';
import * as save from './save';
import Sky from './Sky';


const $game = document.getElementById('game');
const $loader = document.getElementById('loader');

export default class App {

  constructor() {
    this.init();
  }

  init() {

    this.state = null;

    this.canvas = $game;

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 2000);
    
    this.createScene();
    this.createRenderer();

    this.time = 10;
    this.setTime(this.time);

    this.chunkLoader = new ChunkLoader(this.scene, options.get('renderDist'));

    this.controls = new Controls();
    this.player = new Player(this);
    this.stopSaving = save.init(this.player.position);

    this.setState('LOADING');
    
    // Resize camera and renderer on window resize
    window.addEventListener('resize', this.resize);
  }

  // Create world scene, add lights, skybox, and fog
  createScene() {
    this.scene = new THREE.Scene();

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
  }

  createRenderer() {
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

  reload() {
    this.dispose();
    this.init();

    this.chunkLoader.loadInitial(this.player.position.x, this.player.position.z).then(() => {
      this.start();
    })
    .catch(console.error);
  }

  // Resize viewport
  resize = () => {
    const w = window.innerWidth,
          h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setTime(hour) {
    this.time = hour % 24.0;
    const norm = hour / 24;
    const angle = -norm * 2 * Math.PI - Math.PI / 2;
    this.dirLight.position.set(Math.cos(angle), Math.sin(angle), 0).normalize();
    this.sky.setSunPos(0, norm + 0.75);
    this.scene.fog.color.setHSL(0, 0, Math.max(Math.sin(Math.PI * norm), 0.45) - 0.35);
  }

  start() {
    // Start the update and render loops
    MainLoop.setUpdate(this.update).setDraw(this.render).setEnd(this.updateEnd).start();

    this.controls.bindControls();

    ui.set('chunkX', this.chunkLoader.playerChunk.x);
    ui.set('chunkZ', this.chunkLoader.playerChunk.z);

    this.controls.bindPress('toggleInfo', ui.toggleInfo);
    this.controls.bindPress('toggleMenu', () => {
      if (this.state === 'PAUSED') { // TODO not working
        setTimeout(() => this.state === 'PAUSED' && this.setState('PLAYING'), 200);
      } else if (this.state === 'PLAYING') {
        this.setState('PAUSED');
      }
    });

    this.setState('PLAYING');
  }

  // TODO: Fancier state transitions
  setState(newState) {
    console.log('updateState:', this.state, newState);

    // if (this.state === newState) return;

    window.cheat.gameState = this.state = newState;

    if (newState === 'PLAYING') {
      // Reload game on resume if options have changed
      if (options.checkChanged()) {
        this.reload();
        return;
      }
      if (this.canvas.requestPointerLock) this.canvas.requestPointerLock();
    } else if (newState === 'PAUSED') {
      if (document.exitPointerLock) document.exitPointerLock();
    }
    
    $loader.classList[newState === 'LOADING' ? 'remove' : 'add']('hidden');
    ui.setActiveMenu(newState === 'PAUSED'); // TEMP
    this.controls.clearPresses();
  }

  updateEnd = (fps, panic) => {
    ui.set('FPS', fps);

    if (panic) { // TODO
      const skipped = MainLoop.resetFrameDelta();
      console.warn('Skipped frames:', skipped);
    }
  }

  update = (delta) => {
    if (this.state !== 'PLAYING') return;

    this.time += 0.01;
    if (!this.xx) this.xx = 0;
    ((this.xx = this.xx++ % 5) === 0) && this.setTime(this.time);

    this.player.update(delta);
    ui.set('x', this.player.position.x);
    ui.set('y', this.player.position.y);
    ui.set('z', this.player.position.z);

    this.camera.position.copy(this.player.position);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.player.rotation.y);
    this.camera.rotateX(this.player.rotation.x);

    // Skybox follow player
    this.sky.position.set(this.player.position.x, 0, this.player.position.z);

    // Update chunk
    const chunkX = Math.floor(this.player.position.x / Chunk.SIZE);
    const chunkZ = Math.floor(this.player.position.z / Chunk.SIZE);
    if (chunkX !== this.chunkLoader.playerChunk.x || chunkZ !== this.chunkLoader.playerChunk.z) {
      this.chunkLoader.updatePlayerChunk(chunkX, chunkZ);
      
      ui.set('chunkX', this.chunkLoader.playerChunk.x);
      ui.set('chunkZ', this.chunkLoader.playerChunk.z);
    }
  }

  render = () => {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stopSaving();
    this.renderer.dispose();
    this.controls.unbindControls();
    window.removeEventListener('resize', this.resize);
  }
}
