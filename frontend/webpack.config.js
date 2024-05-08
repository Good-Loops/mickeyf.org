const path = require('path');

module.exports = {
    entry: {
        main: ['./src/main.ts'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            "path": require.resolve("path-browserify"),
            "os": require.resolve("os-browserify/browser"),
            "crypto": require.resolve("crypto-browserify"),
            "vm": require.resolve("vm-browserify"),
            "buffer": require.resolve("buffer/"),
            "stream": require.resolve("stream-browserify")
        }
    },
    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'public/dist'),
    },
};