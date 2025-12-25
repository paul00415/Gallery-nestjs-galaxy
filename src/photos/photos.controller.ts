import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PhotosService } from './photos.service';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { SearchPhotoDto } from './dto/search-photo.dto';
import { SignedUrlDto } from './dto/signed-url.dto';
import { ApiTags, ApiBearerAuth, ApiOperation,  } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@ApiTags('photos')
@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  // 🔹 Get signed URL
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('signed-url')
  @ApiOperation({ summary: 'Get signed URL for image upload' })
  getSignedUrl(@Body() dto: SignedUrlDto) {
    return this.photosService.getSignedUploadUrl(dto.mimeType);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create photo' })
  @Post()
  create(
    @CurrentUser() user: { userId: number }, 
    @Body() dto: CreatePhotoDto
  ) {
    return this.photosService.create(user.userId, dto);
  }

  @Get() // cursor is id of the last photo the client already has
  findAll(@Query('cursor') cursor?:string) { // infinite scroll loading
    return this.photosService.findAll(cursor ? Number(cursor) : undefined);
  }

  @Post('search')
  search(@Body() dto: SearchPhotoDto) {
    return this.photosService.search(dto.keyword);
  }

  @Get('recent')
  recent() {
    return this.photosService.recent();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.photosService.findOne(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  update(
    @Param('id') id: string, 
    @CurrentUser() user: { userId: number },
    @Body() dto: UpdatePhotoDto
  ) {
    return this.photosService.update(Number(id), user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: number }
  ) {
    return this.photosService.remove(Number(id), user.userId);
  }
}
