import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SearchPhotoDto {
  @ApiProperty({ example: 'beach' })
  @IsString()
  keyword: string;
}
