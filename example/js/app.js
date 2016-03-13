import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import * as MarsClient from 'marsdb-sync-client';
import Collection from 'marsdb';
import DDPTestComponent from './components/DDPTestComponent';

// Configure Mars stack
MarsClient.configure({ url: 'ws://localhost:3000' });
Collection.defaultStorageManager(require('marsdb-localforage'));

// Startup app
ReactDOM.render(
  <DDPTestComponent />,
  document.getElementById('root')
);
