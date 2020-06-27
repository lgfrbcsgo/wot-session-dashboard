const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
const path = require("path");

module.exports = ({ifDev, ifProd}) => ({
    ...ifDev({
        mode: 'development',
        devtool: 'eval-source-map',
    }),
    ...ifProd({
        mode: 'production',
        devtool: 'source-map'
    }),
    entry: "./src/App.fsproj",
    output: {
        path: path.join(__dirname, "./dist"),
        filename: '[name].[hash].js',
    },
    devServer: {
        publicPath: "/",
        contentBase: "./dist",
        port: 8080,
        historyApiFallback: true,
    },
    resolve: {
        alias: {
            'react': 'preact/compat',
            'react-dom': 'preact/compat'
        },
    },
    module: {
        rules: [
            {
                test: /\.fs(x|proj)?$/,
                use: "fable-loader",
            },
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './src/index.html',
        }),
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
        }),
    ],
});
