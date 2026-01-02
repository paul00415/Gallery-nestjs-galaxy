import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PhotosService } from './photos.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { CurrentUser } from '../auth/decorator/current-user.decorator';

import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { SearchPhotoDto } from './dto/search-photo.dto';
import { SignedUrlDto } from './dto/signed-url.dto';

@ApiTags('photos')
@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  // SIGNED URLS

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('signed-upload')
  @ApiOperation({ summary: 'Get signed URL for image upload' })
  getSignedUploadUrl(@Body() dto: SignedUrlDto) {
    return this.photosService.getSignedUploadUrl(dto.mimeType);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('signed-view/:key')
  @ApiOperation({ summary: 'Get signed URL for image view' })
  getSignedViewUrl(@Param('key') key: string) {
    return this.photosService.getSignedViewUrl(key);
  }

  // CRUD

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create photo' })
  create(
    @CurrentUser() user: { userId: number },
    @Body() dto: CreatePhotoDto,
  ) {
    return this.photosService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get photos (search + infinite scroll)' })
  findAll(
    @Query('query') query?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '12',
  ) {
    return this.photosService.findAll({
      query,
      cursor: cursor ? Number(cursor) : undefined,
      limit: Number(limit),
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('owner')
  @ApiOperation({ summary: 'Get all owner photos (infinite scroll)' })
  owner(
    @CurrentUser() user: { userId: number },
    @Query('query') query?: string,
  ) {
    return this.photosService.findOwners({
      userId: user.userId,
      query,
    });
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent photos' })
  recent() {
    return this.photosService.recent();
  }

  @Post('search')
  @ApiOperation({ summary: 'Search photos' })
  search(@Body() dto: SearchPhotoDto) {
    return this.photosService.search(dto.keyword);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get photo by id' })
  findOne(@Param('id') id: string) {
    return this.photosService.findOne(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update photo' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: number },
    @Body() dto: UpdatePhotoDto,
  ) {
    return this.photosService.update(Number(id), user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete photo' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: number },
  ) {
    return this.photosService.remove(Number(id), user.userId);
  }
}

