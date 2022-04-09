import { Module } from "@nestjs/common";
import { NestApplicationContext } from "@nestjs/core";
import { SwaggerController } from "../controller/doc/Swagger.controller";
import { AssetMetadataController } from "../controller/metadata/Metadata.controller";

@Module({
    imports: [],
    controllers: [
        AssetMetadataController,
        SwaggerController,
    ],
    providers: []
})
export class App 
extends NestApplicationContext {}