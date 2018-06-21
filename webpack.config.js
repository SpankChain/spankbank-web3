let path = require('path')
let WebpackShellPlugin = require('webpack-shell-plugin')


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
    extensions: [ '.tsx', '.ts', '.js' ]
  },

  output: {
    filename: 'spankbank.js',
    path: path.resolve(__dirname, 'dist'),
    library: ['spankbank'],
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
