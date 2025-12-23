import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CreatePhotoDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  desc: string;

  @ApiProperty()
  @IsString()
  imageUrl: string;

  @ApiProperty()
  @IsInt()
  posterId: number;
}
