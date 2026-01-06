import { Body, Controller, Post, Get, UseGuards, Headers, Req, Res, Query, UnauthorizedException } from '@nestjs/common';
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
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res,
  ) {
    const result = await this.authService.login(dto);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      // Use 'none' in production to allow cross-site cookies (requires secure=true).
      // Use 'lax' in development to ease local testing with redirects.
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return {
      accessToken: result.accessToken,
      user: result.user
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  getMe(@CurrentUser() user: { userId: number }) {
    return this.authService.getMe(user.userId);
  }
  
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @Post('refresh')
  async refresh(
    @Req() req,
    @Res({ passthrough: true }) res,
  ) {
    // Log presence of refresh cookie (do not log token value)
    console.log('refresh cookie present:', !!req.cookies?.refreshToken);
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  async logout(
    @CurrentUser() user: { userId: number },
    @Res({ passthrough: true }) res,
  ) {
    await this.authService.logout(user.userId);

    res.clearCookie('refreshToken', { path: '/auth/refresh' });

    return { message: 'Logged out' };
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
    const { accessToken, refreshToken } =
      await this.authService.googleLogin(req.user);

    // Set refresh token cookie (same as normal login)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      // Use 'none' in production to allow cross-site cookies (requires secure=true).
      // Use 'lax' in development to ease local testing with redirects.
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with accessToken
    const redirectUrl = `${process.env.FRONTEND_URL}/oauth/google?token=${accessToken}`;
    return res.redirect(redirectUrl);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res) {
    await this.authService.verifyEmail(token);
    // Redirect to frontend with accessToken
    const redirectUrl = `${process.env.FRONTEND_URL}/email-verified`;
    return res.redirect(redirectUrl);
  }
}
