let path = require('path')
let webpack = require('webpack')
let WebpackShellPlugin = require('webpack-shell-plugin')
let findNodeModules = require('find-node-modules')


module.exports = {
  entry: './spankbank.ts',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
    ]
  },

  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
    alias: {
      '@contracts': path.resolve(__dirname, findNodeModules()[0], '@spankdev/spankbank/build/contracts/'),
    }
  },

  output: {
    filename: 'spankbank.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'spankbank',
    libraryTarget: 'umd',
    globalObject: 'typeof self !== \'undefined\' ? self : this',
  },

  plugins: [
    new WebpackShellPlugin({
      onBuildStart: ['npm run example-build-defs'],
    }),
  ],

  devServer: {
    contentBase: path.join(__dirname),
    publicPath: '/dist/',
    port: 6933,
    open: true,
    openPage: 'example.html',
  }
}
