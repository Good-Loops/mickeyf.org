const path = require("path");

module.exports = [
    {
        mode: process.env.NODE_ENV,
        entry: {
            index: ["./src/index.ts"],
        },
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
    },
];