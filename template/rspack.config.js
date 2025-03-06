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
          },
        },
        type: "javascript/auto",
      },
    ],
  },
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    // The main output file (ES module)
    filename: "main.js",
    // Tell Rspack to emit a module
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
