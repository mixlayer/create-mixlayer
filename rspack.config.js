const path = require("node:path");
const { rspack } = require("@rspack/core");

module.exports = {
  plugins: [
    new rspack.BannerPlugin({
      banner: "#!/usr/bin/env node",
      raw: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  module: {
    rules: [
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
    filename: "index.js",
  },
  optimization: {
    minimize: false,
    concatenateModules: false,
    usedExports: false,
    splitChunks: false,
    runtimeChunk: false,
  },
};
