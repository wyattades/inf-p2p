const config = (module.exports = require('webpack-boiler')({
  pages: [
    {
      title: 'P2P Test',
      template: './src/index.pug',
      meta: {
        description: '<Temporary description>',
      },
      headElements: [{ tag: 'script', src: '/ammo.js', 'data-test': '1' }],
    },
  ],
  basename: 'inf-p2p',
}));

config.module.rules.push({
  test: /\.(frag|vert)$/,
  loader: 'raw-loader',
});

config.externals = {
  ammo: 'Ammo',
};
