const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

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
            // Add CSS loaders if you're handling styles
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'public/dist'),
        publicPath: '/'
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './public/index.html',
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 3000,
        hot: true,
        proxy: [{
            context: ['/api'],
            target: 'http://localhost:8080',
            secure: false
        }]
    }
};