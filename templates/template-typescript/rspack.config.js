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
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            parser: {
              syntax: "typescript",
            },
            target: "es2023",
          },
        },
        type: "javascript/auto",
      },
    ],
  },
  entry: "./src/index.ts",
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
  performance: {
    maxAssetSize: 10000000,
    maxEntrypointSize: 10000000,
  },
  optimization: {
    minimize: false,
    concatenateModules: false,
    usedExports: false,
    splitChunks: false,
    runtimeChunk: false,
  },
};
