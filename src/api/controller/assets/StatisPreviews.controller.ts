import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from "path";

export const ServeStaticPreviews = ServeStaticModule.forRoot({
    rootPath: join(process.cwd(), 'storage', 'previews'),
    serveRoot: '/nft_assets/previews'
})