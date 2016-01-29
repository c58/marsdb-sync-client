'use strict';

var gulp = require('gulp');
var runSequence = require('run-sequence');

gulp.task('release', ['clean'], function(cb) {
  cb = cb || function() {};
  global.isProd = true;
  process.env.NODE_ENV = 'production';
  runSequence('build', 'lint', cb);
});