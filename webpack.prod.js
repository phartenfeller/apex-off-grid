import CopyPlugin from 'copy-webpack-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TerserPlugin from 'terser-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(__dirname, 'src', 'index.ts');
const entryWorker = path.resolve(__dirname, 'src', 'worker', 'opfs-worker.ts');
const outputPath = path.resolve(__dirname, 'dist');

export default {
  entry: {
    index: entry,
    'index.min': entry,
    // 'opfs-worker.min': entryWorker,
  },

  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'asset/inline',
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },

  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'src/worker/db/jswasm' }],
    }),
  ],
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
};
