import { Module } from "@nestjs/common";
import { NestApplicationContext } from "@nestjs/core";
import { SwaggerController } from "../controller/doc/Swagger.controller";
import { AssetMetadataController } from "../controller/metadata/Metadata.controller";
import { AssetStorageProvider } from "../provider/AssetStorage.provider";

@Module({
    imports: [],
    controllers: [
        AssetMetadataController,
        SwaggerController,
    ],
    providers: [
        AssetStorageProvider,
    ]
})
export class App 
extends NestApplicationContext {}