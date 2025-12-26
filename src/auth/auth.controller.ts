import { Body, Controller, Post, Get, UseGuards, Headers, Req, Res, Query} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { CurrentUser } from './decorator/current-user.decorator';
import { RefreshTokenGuard } from './guard/refresh-token.guard';
import { RefreshDto } from './dto/refresh.dto';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthGuard } from './guard/google-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Email + Password Auth

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  getMe(@CurrentUser() user: { userId: number }) {
    return this.authService.getMe(user.userId);
  }
  
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  logout(@CurrentUser() user: { userId: number }) {
    return this.authService.logout(user.userId);
  }

  // Google OAuth

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    //Redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req, @Res() res) {
    const tokens = await this.authService.googleLogin(req.user);
    return res.status(200).json(tokens);
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}
