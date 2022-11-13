import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  entry: path.resolve(__dirname, "src", "index.js"),

  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: { loader: "worker-loader" },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "index.html",
    }),
  ],
  optimization: {
    minimize: false,
  },
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "demo"),
    filename: "index.js",
  },
  devServer: {
    open: false,
    hot: "only",
    liveReload: true,
    static: {
      directory: path.join(__dirname, "demo"),
      watch: true,
      serveIndex: true,
    },
  },
};
