const path = require("path");

module.exports = [
    {
        // Set the mode to development or production
        mode: process.env.NODE_ENV,
        entry: {
            index: ["./src/index.ts"],
        },
        // Enable sourcemaps for debugging webpack's output.
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
            ],
        },
        // When importing a module whose path matches one of the following, just
        resolve: {
            extensions: [".tsx", ".ts", ".js"],
        },
        // Tell webpack to minimize the bundle using the TerserPlugin.
        output: {
            filename: "[name].min.js",
            path: path.resolve(__dirname, "dist"),
        },
    },
    {
        mode: process.env.NODE_ENV,
        entry: {
            server: ["./backend/server.ts"],
        },
        target: 'node',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: [".tsx", ".ts", ".js"],
        },
        output: {
            filename: "[name].min.js",
            path: path.resolve(__dirname, "dist"),
        },
        externals: {
            express: 'commonjs express', // Exclude express from bundling
        },
    },
];