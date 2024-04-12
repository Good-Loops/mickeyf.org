const path = require('path');
const webpack = require('webpack');

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
    plugins: [
        new webpack.DefinePlugin({
            'process.env.API_URL': JSON.stringify(process.env.API_URL),
        }),
    ],
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
