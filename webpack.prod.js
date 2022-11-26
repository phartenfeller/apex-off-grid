import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TerserPlugin from 'terser-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(__dirname, 'src', 'index.ts');

export default {
  entry: {
    index: entry,
    'index.min': entry,
  },

  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' },
      },
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

  plugins: [],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ test: /\.min\.js$/ })],
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
};
