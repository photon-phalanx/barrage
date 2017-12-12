var path = require('path')
var webpack = require('webpack')

function resolve(dir) {
  return path.join(__dirname, '..', dir)
}

module.exports = {
  entry: './src/index',
  output: {
    path: resolve('dist'),
    filename: 'barrage.js',
    publicPath: '/assets/',
    library: 'Barrage',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'eslint-loader',
        enforce: "pre",
        include: [resolve('src')],
        options: {
          formatter: require('eslint-friendly-formatter')
        }
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [resolve('src')]
      }
    ]
  },
  devServer: {
    historyApiFallback: true,
    // noInfo: true,
    noInfo: false,
    overlay: true,
    port: 3000,
    proxy: {
      '/api/*': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure:false
      }
    }
  },
  devtool: '#eval-source-map'
};
