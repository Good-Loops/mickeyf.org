const path = require('path');

// Common configuration settings
const commonConfig = {
    mode: process.env.NODE_ENV,
    devtool: process.env.NODE_ENV === 'development' ? 'eval-source-map' : 'source-map',
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
};

// Configuration for client-side
const clientConfig = {
    ...commonConfig,
    entry: {
        index: './src/client/main.ts',
    },
    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'public/dist'),
    }
};

// Configuration for server-side
const serverConfig = {
    ...commonConfig,
    target: 'node', // Important: configures Webpack to compile for usage in a Node.js environment
    entry: {
        server: './src/server/server.ts',
    },
    output: {
        filename: '[name].min.js',
        path: path.resolve(__dirname, 'src/server'),
    },
    externalsPresets: { node: true }, // Ignore node_modules being bundled
    externals: { // Required to keep node_modules out of the server bundle
        formidable: 'commonjs formidable',
        express: 'commonjs express',
    },
    node: {
        __dirname: false, // Preserve the default node behavior for __dirname
        __filename: false, // Preserve the default node behavior for __filename
    },
};

module.exports = [clientConfig, serverConfig];