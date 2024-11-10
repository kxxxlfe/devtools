const path = require('path')
const { createConfig } = require('@vue-devtools/build-tools')
const openInEditor = require('launch-editor-middleware')
const { web } = require('webpack')

const webpackConfig = createConfig({
  entry: {
    devtools: './src/devtools.js',
    backend: './src/backend.js',
    hook: './src/hook.js',
    target: './target/index.js',
  },
  output: {
    path: path.join(__dirname, '/build'),
    publicPath: '/build/',
    filename: '[name].js',
  },
  devtool: 'cheap-module-source-map',
  devServer: {
    hot: true,
    static: {
      directory: path.join(__dirname), // 确保指向包含index.html的目录
    },
    setupMiddlewares(middlewares, ctx) {
      if (!ctx) {
        return
      }
      ctx.app.use('/__open-in-editor', openInEditor())

      return middlewares
    },
  },
})

module.exports = webpackConfig
