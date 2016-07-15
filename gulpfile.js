
var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var pkg = require('./package.json');
var beautify = require('gulp-jsbeautifier');
var exec = require('child_process').exec;

gulp.task('watch', function() {
  nodemon({
    script: 'test/test.js',
  }).on('restart', function(){
    console.log((new Array(50)).join('=') + (new Array(25)).join('\n'));
  });
});

gulp.task('mongo', function() {
  exec('mongod');
});

gulp.task('beautify', function() {
  gulp.src('./lib/*.js')
    .pipe(beautify({ config: '.jsbeautifyrc', mode: 'VERIFY_AND_WRITE'}))
    .pipe(gulp.dest('./lib'));
});

gulp.task('devserver', ['mongo', 'watch']);
