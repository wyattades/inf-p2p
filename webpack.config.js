const path = require('path');
const boil = require('webpack-boiler');
const webpack = require('webpack');

/** @type {import('webpack').Configuration} */
const config = (module.exports = boil({
  pages: [
    {
      title: 'inf-p2p',
      template: './src/index.pug',
      meta: {
        description: '<Temporary description>',
      },
    },
  ],
  // basename: 'inf-p2p',
}));

config.module.rules.push({
  test: /\.(frag|vert)$/,
  loader: 'raw-loader',
});

for (const dir of ['src'])
  config.resolve.alias[dir] = path.resolve(__dirname, dir);

config.experiments = { syncWebAssembly: true };

// not allowed in webpack-dev-server@beta-4
delete config.devServer.watchContentBase;
