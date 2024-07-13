import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { src, dest, series, parallel, watch } from 'gulp';
import gulp from 'gulp';
import browsersync from 'browser-sync';
import fileinclude from 'gulp-file-include';
import autoprefixer from 'gulp-autoprefixer';
import group_media from 'gulp-group-css-media-queries';
import clean_css from 'gulp-clean-css';
import rename from 'gulp-rename';
import imagemin from 'gulp-imagemin';
import webp from 'gulp-webp';
import webpHTML from 'gulp-webp-html';
import ttf2woff from 'gulp-ttf2woff';
import ttf2woff2 from 'gulp-ttf2woff2';
import fonter from 'gulp-fonter';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import uglify from 'gulp-uglify-es';

let uglif = uglify.default;

const scss = gulpSass(dartSass);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let project_folder = path.basename(__dirname);
let source_folder = '#src'; // Ensure this matches your actual directory name

let paths = {
    build: {
        html: `${project_folder}/`,
        css: `${project_folder}/css/`,
        js: `${project_folder}/js/`,
        img: `${project_folder}/img/`,
        fonts: `${project_folder}/fonts/`,
    },
    src: {
        html: [`${source_folder}/*.html`, `!${source_folder}/_*.html`],
        css: `${source_folder}/scss/style.scss`,
        js: `${source_folder}/js/script.js`,
        img: `${source_folder}/img/**/*.{jpg,png,svg,gif,ico,webp}`,
        fonts: `${source_folder}/fonts/*.ttf`,
    },
    watch: {
        html: `${source_folder}/**/*.html`,
        css: `${source_folder}/scss/**/*.scss`,
        js: `${source_folder}/js/**/*.js`,
        img: `${source_folder}/img/**/*.{jpg,png,svg,gif,ico,webp}`,
    },
    clean: `./${project_folder}/`,
};

async function browserSync(params) {
    browsersync.init({
        server: {
            baseDir: `./${project_folder}/`,
        },
        port: 3000,
        notify: false,
    });
}

function html() {
    return src(paths.src.html)
        .pipe(fileinclude())
        .pipe(webpHTML())
        .pipe(dest(paths.build.html))
        .pipe(browsersync.stream());
}

function css() {
    return src(paths.src.css)
        .pipe(
            scss({
                outputStyle: 'expanded',
            })
        )
        .pipe(group_media())
        .pipe(
            autoprefixer({
                overrideBrowserslist: ['last 5 versions'],
                cascade: true,
            })
        )
        .pipe(dest(paths.build.css))
        .pipe(clean_css())
        .pipe(
            rename({
                extname: '.min.css',
            })
        )
        .pipe(dest(paths.build.css))
        .pipe(browsersync.stream());
}

async function js() {
    return src(paths.src.js)
        .pipe(fileinclude())
        .pipe(dest(paths.build.js))
        .pipe(uglif()) // Uglify JavaScript
        .pipe(
            rename({
                extname: '.min.js',
            })
        )
        .pipe(dest(paths.build.js))
        .pipe(browsersync.stream());
}

function images() {
    return src(paths.src.img)
        .pipe(
            webp({
                quality: 70,
            })
        )
        .pipe(dest(paths.build.img))
        .pipe(src(paths.src.img))
        .pipe(
            imagemin({
                progressive: true,
                svgoPlugins: [{ removeViewBox: false }],
                interlaced: true,
                optimizationLevel: 3,
            })
        )
        .pipe(dest(paths.build.img))
        .pipe(browsersync.stream());
}

function fonts() {
	// src(path.src.fonts)
	// 	.pipe(ttf2woff())
	// 	.pipe(dest(path.build.fonts));
	// return src(path.src.fonts)
	// 	.pipe(ttf2woff2())
	// 	.pipe(dest(path.build.fonts));
}

// Task to convert OTF to TTF
gulp.task('otf2ttf', function () {
    return src(`${source_folder}/fonts/*.otf`)
        .pipe(fonter({
            formats: ['ttf'],
        }))
        .pipe(dest(`${source_folder}/fonts/`));
});

function fontsStyle() {
    let file_content = fs.readFileSync(`${source_folder}/scss/_fonts.scss`);
    if (file_content == '') {
        fs.writeFileSync(`${source_folder}/scss/_fonts.scss`, '');
        return fs.readdir(paths.build.fonts, function (err, items) {
            if (items) {
                let c_fontname;
                for (var i = 0; i < items.length; i++) {
                    let fontname = items[i].split('.');
                    fontname = fontname[0];
                    if (c_fontname != fontname) {
                        fs.appendFileSync(
                            `${source_folder}/scss/_fonts.scss`,
                            `@include font("${fontname}", "${fontname}", "400", "normal");\r\n`
                        );
                    }
                    c_fontname = fontname;
                }
            }
        });
    }
}

function watchFiles() {
    gulp.watch(paths.watch.html, html);
    gulp.watch(paths.watch.css, css);
    gulp.watch(paths.watch.js, js);
    gulp.watch(paths.watch.img, images);
}

async function clean() {
    const { deleteAsync } = await import('del');
    return deleteAsync(paths.clean);
}

let build = series(clean, parallel(js, css, html, images, fonts), fontsStyle);
let watchTask = parallel(build, watchFiles, browserSync);

export { fontsStyle, fonts, images, js, css, html, build, watchTask as watch };
export default watchTask;
