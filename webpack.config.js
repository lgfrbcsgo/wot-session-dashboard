const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const path = require("path");

const config = (ifDev, ifProd) => ({
    ...ifDev({
        mode: 'development',
        devtool: 'eval-source-map'
    }),
    ...ifProd({
        mode: 'production',
        devtool: 'source-map'
    }),
    entry: "./src/App.fsx",
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
    module: {
        rules: [{
            test: /\.fs(x|proj)?$/,
            use: "fable-loader"
        }]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './src/index.html',
        }),
    ]
});

module.exports = (prod = true) => config(ifEnv(!prod), ifEnv(prod));

function ifEnv(active) {
    return arrayOrObject => {
        if (active) {
            return arrayOrObject;
        } else {
            return Array.isArray(arrayOrObject) ? [] : {};
        }
    }
}