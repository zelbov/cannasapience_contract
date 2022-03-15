const webpack = require('webpack')
const nodeExternals = require('webpack-node-externals');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = function(env, argv) {

    const commonConfigs = {

        devtool: env.production ? 'source-map' : 'inline-source-map',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true
                        }
                    },
                    exclude: /node_modules/
                },
                {
                    test: /\.node$/,
                    use: {
                        loader: 'native-ext-loader'
                    }
                },
            ]
        },
        plugins: [
            new webpack.IgnorePlugin({
                checkResource(resource) {

                    const lazyImports = [
                        
                        '@nestjs/microservices', 
                        '@nestjs/platform-express', 
                        '@nestjs/websockets/socket-module',
                        '@nestjs/microservices/microservices-module',
                        'cache-manager', 
                        'class-validator', 
                        'class-transformer',
                        'class-transformer/storage',
                        'class-transformer/cjs/storage',
                        'esprima',
                        'fastify-swagger',
                        'fastify-static',
                        'mock-aws-s3',
                        'nock',
                        'aws-sdk'

                    ];
                    if (!lazyImports.includes(resource)) {
                        return false;
                    }
                    try {
                        require.resolve(resource);
                    } catch (err) {
                        return true;
                    }

                    return false;
                },
            }),
            new ESLintPlugin({
                extensions: ['.ts', '.tsx'],
                quiet: false,
                exclude: ['node_modules', 'dist', 'public', 'static']
            })
        ],
        externalsPresets: { node: true },
        externals: [nodeExternals()],
        resolve: {
            extensions: [ '.ts', '.tsx', '.js', '.json', '.node' ],
        },
        optimization: {
            nodeEnv: false,
            minimize: false
        },
        stats: {
            //warnings: false
        },
        target: 'node'
    
    }

    const buildBundle = {

        ...commonConfigs,

        entry: {
            app: [__dirname+'/src/index.ts']
        },
        output: {
            filename: 'index.js',
            path: __dirname+'/dist'
        },
        mode: env.production ? 'production' : 'development'

    }

    const testsBundle = {

        ...commonConfigs,

        entry: './test/ENV.ts',
        output: {
            filename: 'tests.bundle.js',
            path: __dirname+'/dist'
        },
        mode: 'none' //overridden by top-level test hook (ENV.ts)

    }

    const integrationTestsBundle = {

        ...commonConfigs,

        entry: './test/ENV_integration.ts',
        output: {
            filename: 'tests.integration.bundle.js',
            path: __dirname+'/dist'
        },
        mode: 'none' //overridden by top-level test hook (ENV.ts)

    }

    const benchmarksBundle = {
        
        ...commonConfigs,

        entry: './test/ENV_benchmark.ts',
        output: {
            filename: 'benchmarks.bundle.js',
            path: __dirname+'/dist'
        },
        externals: [nodeExternals(['perf_hooks'])],
        mode: 'none' //overridden by top-level test hook (ENV_benchmark.ts)

    }

    // Additional configs depending on environment

    if(!argv.mode) {

        Object.assign(buildBundle, { mode: 'production' });
        
    } else {

        Object.assign(buildBundle, {
            mode: argv.mode,
            watch: true,
            devtool: 'inline-source-map'
        });

        Object.assign(testsBundle, {
            watch: true, 
            devtool: 'inline-source-map'
        })

        Object.assign(integrationTestsBundle, {
            watch: true,
            devtool: 'inline-source-map'
        })
        
        Object.assign(benchmarksBundle, {
            watch: true, 
            devtool: 'inline-source-map'
        })

    };

    console.log('Bundler starting in', argv.mode || 'production', 'mode');

    return [buildBundle, testsBundle, integrationTestsBundle, benchmarksBundle];

}