'use strict';

module.exports = {
  src: 'lib/**/*',
  dist: 'dist',
  build: 'build',

  browser: {
    bundleName: 'marsdb.meteor.js',
    bundleMinName: 'marsdb.meteor.min.js',
    entry: 'index.js',
    entryTests: 'browser_tests.js',
  }
};
