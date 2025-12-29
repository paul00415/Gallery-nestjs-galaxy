import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mailService: MailService,
  ) {}

  // ===============================
  // REGISTER (EMAIL + PASSWORD)
  // ===============================
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        isEmailVerified: false,
      },
    });

    await this.sendEmailVerification(user.id, user.email);

    return {
      message: 'Registration successful. Please verify your email.',
    };
  }

  // ===============================
  // LOGIN
  // ===============================
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    const {accessToken, refreshToken} = await this.signTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, refreshToken);

    return { accessToken, user };
  }

  // GOOGLE LOGIN
  async googleLogin(googleUser: {
    email: string;
    name: string;
    googleId: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    // Create user if first Google login
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          googleId: googleUser.googleId,
          isEmailVerified: true, // Google emails are already verified
        },
      });
    }

    const tokens = await this.signTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  // ===============================
  // JWT SIGN
  // ===============================
  private async signTokens(userId: number, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(
    userId: number,
    refreshToken: string,
  ) {
    const hashed = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  // ===============================
  // GET ME
  // ===============================
  async getMe(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });
  }

  // ===============================
  // REFRESH TOKENS
  // ===============================
  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new ForbiddenException('Access denied');
      }

      const matches = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!matches) {
        throw new ForbiddenException('Access denied');
      }

      const tokens = await this.signTokens(user.id, user.email);
      await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new ForbiddenException('Access denied');
    }
  }

  // ===============================
  // LOGOUT
  // ===============================
  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logged out successfully' };
  }

  // ===============================
  // EMAIL VERIFICATION
  // ===============================
  private async sendEmailVerification(userId: number, email: string) {
    const token = this.jwt.sign(
      { userId },
      {
        secret: process.env.EMAIL_VERIFY_SECRET,
        expiresIn: '1d',
      },
    );

    await this.mailService.sendVerificationEmail(email, token);
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.EMAIL_VERIFY_SECRET,
      }) as { userId: number };

      await this.prisma.user.update({
        where: { id: payload.userId },
        data: { isEmailVerified: true },
      });

      return { message: 'Email verified successfully. Please login' };
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
