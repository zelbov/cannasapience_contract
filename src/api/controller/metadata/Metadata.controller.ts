import { Controller, forwardRef, Get, HttpStatus, Inject, Post, Req, Res } from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { Request, Response } from 'express'
import { AssetStorageProvider } from "../../provider/AssetStorage.provider";
import { IAssetMetadata } from "../../types/AssetMetadata";

const API_SECRET = process.env.API_SECRET!

if(!API_SECRET) throw new Error('API_SECRET env var is not defined')

@Controller('nft_assets')
@ApiTags('NFT tokens distribution')
export class AssetMetadataController {

    constructor(
        @Inject(forwardRef(() => AssetStorageProvider))
            private provider: AssetStorageProvider
    ){}

    @Get(':tokenId')
    @ApiParam({
        type: Number,
        name: 'tokenId'
    })
    async getMetadata(
        @Req() request: Request<{ tokenId: string }, never, never, never>,
        @Res() response: Response
    ) {

        const { tokenId } = request.params

        try {

            const metadata = await this.provider.getMetadata(tokenId)

            return response.status(HttpStatus.OK)
                .json(metadata)

        } catch(ex) {

            return response.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: (ex as Error).toString(), tokenId })

        }

    }

    @Post('metadata/:tokenId')
    @ApiParam({
        type: Number, 
        name: 'tokenId'
    })
    async setMetadata(
        @Req() request: Request<{ tokenId: string }, never, { metadata: IAssetMetadata, secret: string }>,
        @Res() response: Response<{ success: boolean, error?: string }>,
    ){

        const { tokenId } = request.params

        try {

            const { metadata, secret } = request.body

            if(secret != API_SECRET) throw new Error('Access denied: secret is invalid')

            //TODO: overwrite `image` URI to storage serve path if not present in source metadata

            await this.provider.setMetadata(tokenId, metadata)

            return response.status(HttpStatus.OK)
                .json({ success: true })

        } catch(ex) {

            const error = (ex as Error).toString()

            return response.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ success: false, error })

        }

    }

}