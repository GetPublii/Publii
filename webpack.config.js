const path = require('path');
const webpack = require('webpack');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
  entry: './app/src/main.js',
  target: 'electron-renderer',
  output: {
    path: path.resolve(__dirname, './app/dist/'),
    publicPath: 'auto',
    filename: 'build.js',
    chunkFilename: '[name].bundle.js',
  },
  plugins: [
    new VueLoaderPlugin()
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader',
          path.resolve(__dirname, 'build/loaders/scoped-css-compat.js')
        ],
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /svg-map-empty-states\.svg$/,
        resourceQuery: /raw/,
        type: 'asset/source'
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        resourceQuery: { not: [/raw/] },
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name].[hash][ext][query]'
        }
      }
    ]
  },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    },
    extensions: ['*', '.js', '.vue', '.json']
  },
  devServer: {
    historyApiFallback: true,
    noInfo: true,
    overlay: true
  },
  performance: {
    hints: false
  },
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-cheap-module-source-map',
  externals: {
    'sharp': 'commonjs sharp'
  }
};

if (process.env.NODE_ENV === 'production') {
  module.exports.plugins = (module.exports.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    })
  ]);
}
