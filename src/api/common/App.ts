import { Module } from "@nestjs/common";
import { NestApplicationContext } from "@nestjs/core";
import { ServeStaticAssets } from "../controller/assets/StaticAssets.controller";
import { ServeStaticPreviews } from "../controller/assets/StatisPreviews.controller";
import { SwaggerController } from "../controller/doc/Swagger.controller";
import { AssetMetadataController } from "../controller/metadata/Metadata.controller";
import { AssetStorageProvider } from "../provider/AssetStorage.provider";

@Module({
    imports: [
        ServeStaticAssets,
        ServeStaticPreviews,
    ],
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