const path = require("node:path");

module.exports = {
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.txt$/,
        type: "asset/source",
      },
    ],
  },
  entry: "./src/index.js",
  output: {
    chunkLoading: false,
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
    publicPath: "",
    library: {
      type: "module",
    },
  },
  experiments: {
    outputModule: true,
  },
  optimization: {
    minimize: false,
    concatenateModules: false,
    usedExports: false,
    splitChunks: false,
    runtimeChunk: false,
  },
};
