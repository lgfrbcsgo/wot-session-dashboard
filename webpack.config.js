const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
const TerserJSPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const PurgecssPlugin = require('purgecss-webpack-plugin')
const path = require('path');
const glob = require('glob');

module.exports = ({ifDev, ifProd}) => ({
    ...ifDev({
        mode: 'development',
        devtool: 'eval-source-map',
    }),
    ...ifProd({
        mode: 'production',
        devtool: 'source-map'
    }),
    entry: ['./src/App.fsproj', './gen/tailwind.css'],
    output: {
        path: path.join(__dirname, './dist'),
        filename: '[name].[hash].js',
    },
    devServer: {
        publicPath: '/',
        contentBase: './dist',
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
                use: 'fable-loader',
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './public/index.html',
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[hash].css',
        }),
        new PurgecssPlugin({
            paths: [
                './public/index.html',
                ...glob.sync('./src/**/*.fs', {nodir: true})
            ],
        }),
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
        }),
    ],
    optimization: {
        splitChunks: {
            cacheGroups: {
                vendor: {
                    name: 'vendor',
                    test: /node_modules/,
                    chunks: 'initial',
                    enforce: true,
                },
            },
        },
        minimizer: ifProd([
            new TerserJSPlugin({}), 
            new OptimizeCSSAssetsPlugin({}),
        ]),
    },
});
