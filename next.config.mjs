/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, _options) {
    config.module.rules.push({
      test: /\.(frag|vert)$/,
      loader: 'raw-loader',
    });

    config.experiments ||= {};
    config.experiments.syncWebAssembly = true;

    return config;
  },
};

export default nextConfig;
