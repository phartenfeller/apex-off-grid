import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TerserPlugin from 'terser-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(__dirname, 'src', 'index.js');
const outputPath = path.resolve(__dirname, 'dist');

export default {
  entry: {
    index: entry,
    'index.min': entry,
    // 'opfs-worker.min': entryWorker,
  },

  module: {
    rules: [],
  },
  resolve: {
    extensions: ['.js'],
  },

  plugins: [],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ test: /\.min\.js$/ })],
  },

  output: {
    path: outputPath,
    filename: '[name].js',
    clean: true,
  },

  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.build_cache'),
  },

  devtool: 'source-map',
};
