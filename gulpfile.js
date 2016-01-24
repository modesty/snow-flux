'use strict';

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var babel = require('gulp-babel');

gulp.task('default', function() {
	return gulp.src('src/*.js')
		.pipe(babel({
			presets: ['es2015']
		}))
		.pipe(uglify())
		.pipe(gulp.dest('dist'));
});
