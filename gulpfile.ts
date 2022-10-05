import type {Configuration} from 'webpack';
import * as gulp from "gulp";
import zip from "gulp-zip";
import webpack from 'webpack-stream';

const webpackConfig: Configuration = {
    mode: 'development',
    target: 'node',
    output: {
        filename: `handler.js`,
        libraryTarget: 'commonjs2',
    },
    externals: {
        "aws-sdk": "aws-sdk",
    },
    resolve: {
        extensions: [ '.ts', '.js' ],
    },
    module: {
        rules: [
            {
                test: /\.ts/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ]
    }
};

const lambdaFolderNames: string[] = [
    'reservation-bot-fulfillment',
    'reservation-ivr-sma-endpoint',
    'target-ivr-sma-endpoint',
];

lambdaFolderNames.forEach((folder) => {

    gulp.task(`package ${folder}`, () => {
        return gulp.src(`lib/lambdas/${folder}/handler.ts`)
            .pipe(webpack(webpackConfig))
            .pipe(zip(`${folder}.zip`))
            .pipe(gulp.dest('build'));
    });

})

gulp.task(`package reservation-bot`, () => {
    return gulp.src(`lib/lex-bots/reservation-bot/**/*`)
        .pipe(zip(`reservation-bot.zip`))
        .pipe(gulp.dest('build'));
});

gulp.task('default',
    gulp.parallel(
        `package reservation-bot`,
        ...lambdaFolderNames.map((folder) => `package ${folder}`),
    )
);
