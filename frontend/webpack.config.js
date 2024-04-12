const path = require('path');

module.exports = {
    mode: process.env.NODE_ENV,
    devtool: 'source-map',
    entry: {
        index: ['./src/index.ts'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devServer: {
        static: {
            directory: path.join(__dirname, '../'),
        },
        compress: true,
        port: 7777,
        open: true,
        hot: true,
        watchFiles: ['src/**/*'],
    },
};
