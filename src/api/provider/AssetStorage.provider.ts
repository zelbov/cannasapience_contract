import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path/posix";
import { IAssetMetadata } from "../types/AssetMetadata";

const storageDir = join(process.cwd(), 'storage'),
    assetsDir = join(storageDir, 'assets'),
    previewsDir = join(storageDir, 'previews'),
    metadataDir = join(storageDir, 'metadata')

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
        return tokenId

    }

    public async saveAsset(tokenId: string, data: Buffer) {

        tokenId = this.safeTokenId(tokenId)

        await writeFile(
            join(assetsDir, tokenId),
            data
        )

    }

    public async saveAssetImage(tokenId: string, ext: string, data: Buffer) {

        tokenId = this.safeTokenId(tokenId)

        await writeFile(
            join(previewsDir, tokenId+'.'+ext),
            data
        )

    }

    public async setMetadata(tokenId: string, data: IAssetMetadata) {

        tokenId = this.safeTokenId(tokenId)

        await writeFile(
            join(metadataDir, tokenId+'.json'),
            JSON.stringify(data, null, 2)
        )

    }

    public async getMetadata(tokenId: string) : Promise<IAssetMetadata> {

        tokenId = this.safeTokenId(tokenId)

        const metadata = JSON.parse(
            readFileSync(
                join(metadataDir, tokenId+'.json')
            ).toString()
        )

        return metadata;

    }

}