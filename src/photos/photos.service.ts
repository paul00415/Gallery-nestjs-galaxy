import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { wasabiClient } from 'src/common/wasabi.client';
import { v4 as uuid } from 'uuid';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';


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
    const fileUrl = `photos/${uuid()}.${fileExt}`;

    const command = new PutObjectCommand({
      Bucket: process.env.WASABI_BUCKET,
      Key: fileUrl,
      ContentType: mimeType
    });

    const uploadUrl = await getSignedUrl(wasabiClient, command, {
      expiresIn: 60 * 5, // 5 minutes
    });
    
    return {
      uploadUrl, fileUrl
    };
  }

  async getSignedViewUrl(key: string) {
    if (!key) {
      throw new BadRequestException('Key is required');
    }

    const command = new GetObjectCommand({
      Bucket: process.env.WASABI_BUCKET,
      Key: key
    });

    return getSignedUrl(wasabiClient, command, {
      expiresIn: 60 * 10, //10 mins
    });
  }

  async create(userId: number, dto: CreatePhotoDto) {
    const newPhoto = await this.prisma.photo.create({
      data: {
        ...dto,
        posterId: userId,
      },
    });
    return {
      ...newPhoto, imageUrl: await this.getSignedViewUrl(newPhoto.imageUrl),
    }
  }

  async findAll({
    query,
    cursor,
    limit,
  }: {
    query?: string;
    cursor?: number;
    limit: number;
  }) {
    const photos = await this.prisma.photo.findMany({
      take: limit + 1, // check hasMore
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      where: query
        ? {
            OR: [
              { title: { contains: query } },
              { desc: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { id: 'desc' },
    });

    const hasMore = photos.length > limit;
    const items = hasMore ? photos.slice(0, limit) : photos;

    return {
      items: await Promise.all(
        items.map(async (p) => ({
          ...p,
          imageUrl: await this.getSignedViewUrl(p.imageUrl),
        })),
      ),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async findOwners({
    userId,
    query,
  }: {
    userId: number;
    query?: string;
  }) {
    const photos = await this.prisma.photo.findMany({
      where: {
        posterId: userId,
        ...(query && {
        OR: [
          { title: { contains: query }},
          { desc: { contains: query }},
        ],
      }),
      },
      orderBy: { id: 'desc' },
      include: {
        poster: { select: { id: true, name: true }},
      }
    });

    return Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        imageUrl: await this.getSignedViewUrl(photo.imageUrl),
      }))
    )
  }
  
  async findOne(id: number) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      include: { poster: { select: { id: true, name: true } } },
    });
    if (!photo) throw new NotFoundException('Photo not found');
    return {
      ...photo,
      imageUrl: await this.getSignedViewUrl(photo.imageUrl),
    };
  }

  private async attachSignedUrl(photo: any) {
    return {
      ...photo,
      imageUrl: await this.getSignedViewUrl(photo.imageUrl),
    }
  }

  async search(keyword?: string) {
    const photos = await this.prisma.photo.findMany({
      where: keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { desc: { contains: keyword } },
            ],
          }
        : undefined,
      include: {
        poster: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(photos.map((p) => this.attachSignedUrl(p)));
  }

  async recent() {
    const photos = await this.prisma.photo.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        poster: { select: { id: true, name: true, email: true } },
      },
    });

    return Promise.all(photos.map((p) => this.attachSignedUrl(p)));
  }

  async update(id: number, userId: number, dto: UpdatePhotoDto) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }
    if (photo.posterId !== userId) {
      throw new ForbiddenException('You can only update your own photos');
    }

    const data: Partial<UpdatePhotoDto> = {
      title: dto.title,
      desc: dto.desc,
    };
    // update image ONLY if provided
    if (dto.imageUrl) {
      data.imageUrl = dto.imageUrl;
    }

    const updatedPhoto = await this.prisma.photo.update({
      where: { id },
      data,
    });

    return {
      ...updatedPhoto,
      imageUrl: await this.getSignedViewUrl(updatedPhoto.imageUrl)
    }
  }

  async remove(id: number, userId: number) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Photo not found');
    if (photo.posterId !== userId) {
      throw new NotFoundException('You can only delete your own photos');
    }

    // delete file from Wasabi
    await wasabiClient.send(
      new DeleteObjectCommand({
        Bucket: process.env.WASABI_BUCKET,
        Key: photo.imageUrl,
      })
    );

    return this.prisma.photo.delete({ where: { id } });
  }
}
