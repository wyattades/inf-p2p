import * as THREE from 'three';

import vertexShader from './Sky.vert';
import fragmentShader from './Sky.frag';

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

const shader = {
  uniforms: {
    luminance: { value: 0.9 },
    turbidity: { value: 10 },
    rayleigh: { value: 0.642 },
    mieCoefficient: { value: 0.005 },
    mieDirectionalG: { value: 0.9 },
    sunPosition: { value: new THREE.Vector3() },
  },
  vertexShader,
  fragmentShader,
};

class Sky extends THREE.Mesh {
  constructor() {
    const geom = new THREE.SphereBufferGeometry(1, 32, 15);

    const material = new THREE.ShaderMaterial({
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      uniforms: THREE.UniformsUtils.clone(shader.uniforms),
      side: THREE.BackSide,
    });

    super(geom, material);

    this.setSunPos(0.245, 0.35);

    this.position.y = -100;
    this.scale.setScalar(450000);
  }

  setSunPos(inclination: number, azimuth: number) {
    const distance = 400000;
    const pos = (this.material as THREE.ShaderMaterial).uniforms.sunPosition
      .value;
    const theta = Math.PI * (inclination - 0.5);
    const phi = 2 * Math.PI * (azimuth - 0.5);
    pos.x = distance * Math.cos(phi);
    pos.y = distance * Math.sin(phi) * Math.sin(theta);
    pos.z = distance * Math.sin(phi) * Math.cos(theta);
  }
}

export default Sky;
