import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SignedUrlDto {
  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type of the file',
  })
  @IsString()
  mimeType: string;
}
