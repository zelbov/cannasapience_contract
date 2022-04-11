import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from "path";

export const ServeStaticAssets = ServeStaticModule.forRoot({
    rootPath: join(process.cwd(), 'storage', 'assets'),
    serveRoot: '/nft_assets/assets'
})