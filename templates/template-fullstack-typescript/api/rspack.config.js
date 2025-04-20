import path from "node:path";
import { rspack } from "@rspack/core";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Create __filename and __dirname equivalents
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  resolve: {
    extensions: [".ts", ".js", ".mjs", ".json"],
    alias: {
      "@": path.resolve(__dirname, "./"),
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
  entry: "./api/src/index.ts",
  output: {
    chunkLoading: false,
    path: path.resolve(process.cwd(), "build"),
    filename: "main.js",
    publicPath: "",
    library: {
      type: "module",
    },
  },
  plugins: [new rspack.SourceMapDevToolPlugin()],
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
