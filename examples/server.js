import http from 'http';
import express from 'express';
import path from 'path';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import MarsSync from 'marsdb-sync-server';
import requireDir from 'require-dir';


// Config
const APP_PORT = 3000;

// Configure webpack compiler
const compiler = webpack({
  entry: path.resolve(__dirname, 'js', 'app.js'),
  module: {
    loaders: [
      {
        exclude: /node_modules/,
        loader: 'babel',
        test: /\.js$/,
        query: {
          presets: ['es2015', 'stage-0', 'react']
        }
      },
    ],
  },
  output: {filename: 'app.js', path: '/'},
});

// Configure express application
const app = express();
const server = http.createServer(app);
app.use('/', express.static(path.resolve(__dirname, 'public')));
app.use(webpackDevMiddleware(compiler, {
  contentBase: '/public/',
  publicPath: '/js/',
  stats: {colors: true},
}));

// Configure marsdb-sync-server
MarsSync.configure({ server: server });
requireDir('./js/models');
requireDir('./js/publishers');
requireDir('./js/methods');

// Start the server
server.listen(APP_PORT, () => {
  console.log(`App is now running on http://localhost:${APP_PORT}`);
});
