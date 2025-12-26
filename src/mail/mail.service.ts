import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"My App" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Verify your email',
        html: `
          <h2>Email Verification</h2>
          <p>Click the link below to verify your email:</p>
          <a href="${verifyUrl}" target="_blank">
            Verify Email
          </a>
          <p>This link will expire in 15 minutes.</p>
        `,
      });
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
