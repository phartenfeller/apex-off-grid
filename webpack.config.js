import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(__dirname, "src", "index.js");

export default {
  entry: {
    index: entry,
  },
  optimization: {
    minimize: false,
  },
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  devServer: {
    open: false,
    hot: "only",
    liveReload: true,
    webSocketServer: false,
  },
};
