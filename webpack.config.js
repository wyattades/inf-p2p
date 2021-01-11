const path = require('path');

const config = (module.exports = require('webpack-boiler')({
  pages: [
    {
      title: 'P2P Test',
      template: './src/index.pug',
      meta: {
        description: '<Temporary description>',
      },
    },
  ],
  basename: 'inf-p2p',
}));

config.module.rules.push({
  test: /\.(frag|vert)$/,
  loader: 'raw-loader',
});

for (const dir of ['src'])
  config.resolve.alias[dir] = path.resolve(__dirname, dir);
