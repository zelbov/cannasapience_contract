require('dotenv').config();

import { NestApplicationOptions } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { App } from "./common/App";
import { SwaggerController } from "./controller/doc/Swagger.controller";
import { HttpExceptionFilter } from "./controller/filter/ExceptionFilter";
import morgan from 'morgan'

if(!process.env.API_PORT)
        throw new Error('API_PORT env var not specified. Make sure you restored config from sample.')

// increment port number to allow running API tests while app is running in dev mode
if(process.env.NODE_ENV == 'test') process.env.API_PORT = (+process.env.API_PORT + 1).toString(); 

export const startService = async () => {

    const options : NestApplicationOptions = {};

    if(process.env.DISABLE_API_LOGGING) options.logger = false;

    const port = +process.env.API_PORT!
    let app = await NestFactory.create(App, options);
    app.useGlobalFilters(new HttpExceptionFilter());
    app.enableShutdownHooks();
    app.enableCors({ origin: '*' });
    SwaggerController.init(app);

    morgan.token('body', (req) => JSON.stringify(
        //@ts-ignore
        req['body']
    ))
    if(!process.env.DISABLE_API_LOGGING)
        app.use(morgan(':status :method \t:response-time ms -> :url :body'))
    
    await app.listen(port);
    return app;

}

if(process.env.NODE_ENV != 'test') startService()