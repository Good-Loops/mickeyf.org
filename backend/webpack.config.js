const path = require('path');

module.exports = {
    entry: {
        server: ['./app.ts'],
    },
    target: 'node',
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
    externals: {
        express: 'commonjs express', // Exclude express from bundling
    },
};