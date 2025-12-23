import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Injectable()
export class PhotosService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreatePhotoDto) {
    return this.prisma.photo.create({
      data: {
        title: dto.title,
        desc: dto.desc,
        imageUrl: dto.imageUrl,
        posterId: dto.posterId,
      },
      include: {
        poster: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  findAll() {
    return this.prisma.photo.findMany({
      include: {
        poster: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
