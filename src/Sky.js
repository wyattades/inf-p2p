import * as THREE from 'three';


/**
 * @author zz85 / https://github.com/zz85
 *
 * Based on "A Practical Analytic Model for Daylight"
 * aka The Preetham Model, the de facto standard analytic skydome model
 * http://www.cs.utah.edu/~shirley/papers/sunsky/sunsky.pdf
 *
 * First implemented by Simon Wallner
 * http://www.simonwallner.at/projects/atmospheric-scattering
 *
 * Improved by Martin Upitis
 * http://blenderartists.org/forum/showthread.php?245954-preethams-sky-impementation-HDR
 *
 * Three.js integration by zz85 http://twitter.com/blurspline
*/

const DEFAULT_UNIFORMS = {
  luminance: { value: 0.9 },
  turbidity: { value: 10 },
  rayleigh: { value: 0.642 },
  mieCoefficient: { value: 0.005 },
  mieDirectionalG: { value: 0.9 },
  sunPosition: { value: new THREE.Vector3() },
};

const loadFile = (url) => new Promise((resolve, reject) => {
  new THREE.FileLoader().load(url, resolve, null, reject);
});

class Sky extends THREE.Mesh {

  constructor() {

    const geom = new THREE.SphereBufferGeometry(1, 32, 15);

    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(DEFAULT_UNIFORMS),
      side: THREE.BackSide,
    });

    super(geom, material);

    Promise.all([ loadFile('shaders/sky_fragment.glsl'), loadFile('shaders/sky_vertex.glsl') ])
    .then(([ fragmentShader, vertexShader ]) => {
      this.material.fragmentShader = fragmentShader;
      this.material.vertexShader = vertexShader;
    })
    .catch(console.error);

    this.setSunPos(0.245, 0.35);

    this.position.y = -100;
    this.scale.setScalar(450000);
  }

  setSunPos(inclination, azimuth) {
    const distance = 400000;
    const pos = this.material.uniforms.sunPosition.value;
    const theta = Math.PI * (inclination - 0.5);
    const phi = 2 * Math.PI * (azimuth - 0.5);
    pos.x = distance * Math.cos(phi);
    pos.y = distance * Math.sin(phi) * Math.sin(theta);
    pos.z = distance * Math.sin(phi) * Math.cos(theta);
  }

}

export default Sky;
