const fs = require('fs');

const modify = (path, fn, replace) => {
  const txt = fs.readFileSync(path, { encoding: 'utf8' });
  if (replace) fs.unlinkSync(path);
  fs.writeFileSync(replace || path, fn(txt), { encoding: 'utf8' });
};

const PATH = './node_modules/three';

modify(`${PATH}/package.json`, (txt) => {
  const json = JSON.parse(txt);
  json.module = 'src/Three.js';
  json.sideEffects = false;
  return JSON.stringify(json, null, 2);
});

const SHADERS = `${PATH}/src/renderers/shaders`;

let shaders = fs.readdirSync(`${SHADERS}/ShaderChunk`).map((name) => `${SHADERS}/ShaderChunk/${name}`);
shaders = shaders.concat(fs.readdirSync(`${SHADERS}/ShaderLib`).map((name) => `${SHADERS}/ShaderLib/${name}`));

for (const shader of shaders) {
  if (shader.endsWith('.glsl')) {
    modify(shader, (txt) => {
      return `export default \`${txt}\`;`;
    }, shader + '.js');
  }
}
