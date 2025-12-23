import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PhotosService } from './photos.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

@ApiTags('Photos')
@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post()
  @ApiOperation({ summary: 'Create photo' })
  create(@Body() dto: CreatePhotoDto) {
    return this.photosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all photos' })
  findAll() {
    return this.photosService.findAll();
  }
}
