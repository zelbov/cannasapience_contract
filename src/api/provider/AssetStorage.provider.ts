import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path/posix";
import { IAssetMetadata } from "../types/AssetMetadata";

const storageDir = join(process.cwd(), 'storage'),
    samplesDir = join(storageDir, 'samples'),
    assetsDir = join(storageDir, 'assets'),
    previewsDir = join(storageDir, 'previews'),
    metadataDir = join(storageDir, 'metadata')

const sampleMetadata : IAssetMetadata = JSON.parse(
    readFileSync(join(samplesDir, 'asset.template.metadata.json')).toString()
)

const sampleAssetFile : Buffer = readFileSync(
    join(samplesDir, 'asset.template.file')
)

const sampleAssetPreview : Buffer = readFileSync(
    join(samplesDir, 'asset.template.preview.svg')
)

@Injectable()
export class AssetStorageProvider 
implements OnApplicationBootstrap
{

    onApplicationBootstrap() {

        for(let dir of [storageDir, assetsDir, metadataDir, previewsDir])
            if(!existsSync(dir)) mkdirSync(dir)

    }

    public get storageDirectory() { return storageDir }
    public get assetsDirectory() { return assetsDir }
    public get previewsDirectory() { return previewsDir }
    public get metadataDirectory() { return metadataDir }

    private safeTokenId(tokenId: string) {

        // avoid directory traversal or other hacks possibly done by passing non-numeric token ID
        tokenId = parseInt(tokenId).toString()
        if(!tokenId) throw new Error('Cannot get asset metadata for token with ID '+tokenId)
        // avoid generation of infinite amount of artifacts
        if(+tokenId <= 0 || +tokenId > +process.env.MAX_TOKENS!)
            throw new Error('Token ID out of bounds specified in project configuration')
        return tokenId

    }

    public async getMetadata(tokenId: string) : Promise<IAssetMetadata> {

        tokenId = this.safeTokenId(tokenId)

        const path = join(metadataDir, tokenId+'.json')

        if(!existsSync(path)) {

            const data = JSON.parse(JSON.stringify(sampleMetadata))

            data.name = data.name.replace('{TOKEN_ID}', tokenId)
            data.description = data.description.replace('{TOKEN_ID}', tokenId)
            data.image = data.image
                .replace('{BASE_TOKEN_URI}', process.env.ERC721_BASE_TOKEN_URI!.replace(/\/$/, ''))
                .replace('{TOKEN_ID}', tokenId)
            data.external_url = data.external_url
                .replace('{BASE_TOKEN_URI}', process.env.ERC721_BASE_TOKEN_URI!.replace(/\/$/, ''))
                .replace('{TOKEN_ID}', tokenId)

            //TODO: attributes ?

            await writeFile(
                join(assetsDir, tokenId+'.file'), sampleAssetFile
            )
            await writeFile(
                join(previewsDir, tokenId+'.svg'), sampleAssetPreview
            )
            await writeFile(
                path, JSON.stringify(data, null, 2)
            )
            
            return data;

        }

        const metadata = JSON.parse((await readFile(path)).toString())

        return metadata;

    }

}