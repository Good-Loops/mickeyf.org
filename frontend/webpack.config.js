const path = require('path');

module.exports = {
    mode: process.env.NODE_ENV,
    devtool: process.env.NODE_ENV === 'development' ? 'eval-source-map' : 'source-map',
    entry: {
        index: ['./src/main.ts'],
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
        path: path.resolve(__dirname, 'public/dist'),
    },
};