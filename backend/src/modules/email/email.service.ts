import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private configService: ConfigService) {
    const user = (this.configService.get<string>('EMAIL_SMTP_USER') ?? '').trim();
    const pass = (this.configService.get<string>('EMAIL_SMTP_APP_PASSWORD') ?? '').trim().replace(/\s/g, '');
    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('EMAIL_SMTP_HOST', 'smtp.gmail.com'),
        port: this.configService.get<number>('EMAIL_SMTP_PORT', 587),
        secure: this.configService.get<string>('EMAIL_SMTP_SECURE', 'false') === 'true',
        auth: { user, pass },
      });
    } else {
      this.logger.warn('EMAIL_SMTP_USER or EMAIL_SMTP_APP_PASSWORD not set; email sending disabled.');
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendOtpEmail(to: string, otp: string, fullName?: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email is not configured. Set EMAIL_SMTP_USER and EMAIL_SMTP_APP_PASSWORD.');
    }

    const from = this.configService.get<string>('EMAIL_FROM') || this.configService.get<string>('EMAIL_SMTP_USER') || 'noreply@loop-ex.com';
    const greeting = fullName ? `Hi ${fullName},` : 'Hi,';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #333; max-width: 480px; margin: 0 auto; padding: 24px;">
  <p>${greeting}</p>
  <p>Your verification code for Loop Ex signup is:</p>
  <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 24px 0;">${otp}</p>
  <p style="color: #666; font-size: 14px;">This code is valid for 10 minutes. If you didn't request this, you can ignore this email.</p>
  <p style="margin-top: 32px; font-size: 12px; color: #999;">— Loop Ex</p>
</body>
</html>`;

    const text = `${greeting}\n\nYour verification code for Loop Ex signup is: ${otp}\n\nThis code is valid for 10 minutes. If you didn't request this, you can ignore this email.\n\n— Loop Ex`;

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Your Loop Ex verification code',
      text,
      html,
    });

    this.logger.log(`OTP email sent to ${to}`);
  }
}
