
import { SwaggerModule, DocumentBuilder, OpenAPIObject, ApiResponse, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Controller, Get, INestApplication } from '@nestjs/common';
import swaggerUI from 'swagger-ui-express';

import packageInfo from '../../../../package.json';

@ApiTags('API')  
@Controller()
export class SwaggerController {

    private document!: OpenAPIObject;
    private html!: string; 
    private appInit!: Promise<any>;

    private generateHTML(){
        return swaggerUI.generateHTML(this.document)
            .replace(
                './swagger-ui.css', 
                'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.26.2/'+
                'swagger-ui.css'
            )
            .replace(
                './swagger-ui-bundle.js',
                'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.26.2/'+
                'swagger-ui-bundle.js'
            )
            .replace(
                './swagger-ui-standalone-preset.js',
                'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.26.2/'+
                'swagger-ui-standalone-preset.js'
            );
    }

    private initDefaultApp(app: INestApplication){

        const options = new DocumentBuilder()
            .setTitle(packageInfo.name+' API documentation')
            .setVersion(packageInfo.version)
            .addSecurity('bearer', {
                type: 'http', scheme: 'bearer', bearerFormat: 'JWT'
            })
            .build();

        this.appInit = new Promise<void>((resolve) => {
            this.document = SwaggerModule.createDocument(app, options);
            delete this.document.paths['/swagger.json'];
            delete this.document.paths['/swagger-ui-init.js'];
            this.html = this.generateHTML();
            resolve();
        })

    }

    private static _app: INestApplication;

    public static init(app: INestApplication) {

        this._app = app;

    }

    constructor(){

        setImmediate(() => this.initDefaultApp(SwaggerController._app) ); 
        
    }

    @Get('api')
    @ApiExcludeEndpoint()
    @ApiResponse({
        status: 200,
        description: 'This page'
    })
    async getSwaggerUI(){
        await this.appInit;
        return this.html;
    }

    @Get('swagger.json')
    getSwaggerJsonDoc(){
        return this.document
    }

    @Get('swagger-ui-init.js')
    @ApiExcludeEndpoint() 
    getSwaggetUiInitScript(){ //TODO: prettify


        return `window.onload = function() {
            // Begin Swagger UI call region
            const ui = SwaggerUIBundle({
              url: location.origin+"/swagger.json",
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
              ],
              layout: "StandaloneLayout"
            })
            // End Swagger UI call region
            window.ui = ui
          }`
    }

}