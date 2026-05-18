import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { CardsModule } from './cards/cards.module';
import { LinkPreviewModule } from './link-preview/link-preview.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CollectionsModule,
    CardsModule,
    LinkPreviewModule,
  ],
})
export class AppModule {}
