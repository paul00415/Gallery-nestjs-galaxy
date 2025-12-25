import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { wasabiClient } from 'src/common/wasabi.client';
import { v4 as uuid } from 'uuid';
import { PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class PhotosService {
  constructor(private prisma: PrismaService) {}

  async getSignedUploadUrl(mimeType: string) {
    if (!mimeType) {
      throw new BadRequestException('mimeType is required');
    }

    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const fileExt = mimeType.split('/')[1];
    const fileName = `photos/${uuid()}.${fileExt}`;

    const command = new PutObjectCommand({
      Bucket: process.env.WASABI_BUCKET,
      Key: fileName,
      ContentType: mimeType,
    });

    const signedUrl = await getSignedUrl(wasabiClient, command, {
      expiresIn: 60 * 5, // 5 minutes
    });

    return {
      uploadUrl: signedUrl,
      fileUrl: `${process.env.WASABI_ENDPOINT}/${process.env.WASABI_BUCKET}/${fileName}`,
    };
  }

  async create(userId: number, dto: CreatePhotoDto) {
    return this.prisma.photo.create({
      data: {
        ...dto,
        posterId: userId,
      },
    });
  }

  findAll(cursor?: number) {
    return this.prisma.photo.findMany({
      take: 10,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  search(keyword?: string) {
    if (!keyword) {
      return this.findAll();
    }
    return this.prisma.photo.findMany({
      where: {
        OR: [
          { title: { contains: keyword } },
          { desc: { contains: keyword } },
        ],
      },
      include: {
        poster: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recent() {
    return this.prisma.photo.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        poster: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findOne(id: number) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      include: { poster: { select: { id: true, name: true } } },
    });
    if (!photo) throw new NotFoundException('Photo not found');
    return photo;
  }

  async update(id: number, userId: number, dto: UpdatePhotoDto) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Photo not found');
    if (photo.posterId !== userId) {
      throw new NotFoundException('You can only update your own photos');
    }
    return this.prisma.photo.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, userId: number) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Photo not found');
    if (photo.posterId !== userId) {
      throw new NotFoundException('You can only delete your own photos');
    }
    return this.prisma.photo.delete({ where: { id } });
  }
}
