var gulp = require('gulp');

gulp.task('default', function () {
    gulp.src('node_modules/@bit/atkoinc.styling.blue-theme/blue-theme.css')
    .pipe(gulp.dest('assets/libs/css'));
});