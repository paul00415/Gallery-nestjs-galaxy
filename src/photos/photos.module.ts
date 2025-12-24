import { Module } from '@nestjs/common';
import { PhotosService } from './photos.service';
import { PhotosController } from './photos.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [PhotosService, PrismaService],
  controllers: [PhotosController]
})
export class PhotosModule {}
