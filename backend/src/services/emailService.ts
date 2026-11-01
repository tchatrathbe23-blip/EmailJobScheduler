import nodemailer from 'nodemailer';

interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  body: string;
}

interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

class EmailService {
  private testAccount: nodemailer.TestAccount | null = null;
  private transporter: nodemailer.Transporter | null = null;

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    try {
      console.log('[EmailService] Creating or connecting to Ethereal SMTP test account...');
      this.testAccount = await nodemailer.createTestAccount();
      console.log(`[EmailService] Ethereal account ready: ${this.testAccount.user}`);

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass,
        },
      });

      return this.transporter;
    } catch (err: any) {
      console.error('[EmailService] Failed to create Ethereal account:', err.message);
      // Fallback transporter (simulated)
      return nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  public async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const transporter = await this.getTransporter();

    const info = await transporter.sendMail({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
        <h2 style="color: #4f46e5;">ReachInbox Outreach Message</h2>
        <div style="background: #f9fafb; padding: 15px; border-left: 4px solid #6366f1; border-radius: 4px; margin: 15px 0;">
          ${params.body.replace(/\n/g, '<br/>')}
        </div>
        <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px;">
          Sent via ReachInbox Email Job Scheduler &bull; Sender: ${params.from}
        </p>
      </div>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[EmailService] Dispatched email to ${params.to}. MessageId: ${info.messageId}`);
    if (previewUrl) {
      console.log(`[EmailService] Ethereal Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl: previewUrl || false,
    };
  }
}

export const emailService = new EmailService();
