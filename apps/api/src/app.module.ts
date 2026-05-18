import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { CardsModule } from './cards/cards.module';
import { LinkPreviewModule } from './link-preview/link-preview.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/workpaste'),
    AuthModule,
    CollectionsModule,
    CardsModule,
    LinkPreviewModule,
  ],
})
export class AppModule {}
