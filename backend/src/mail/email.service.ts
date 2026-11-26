import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export const RESEND_TEMPLATES = {
  PASSWORD_RESET: '4fc51465-4489-48d6-9b40-f4638a8bef0d',
  WELCOME_MEMBER: 'f76dfce1-8176-4875-98f6-73b8d0bb991d',
  SPARK_LEDGER_ALERT: '41a09c0c-40cc-4ab0-b4fd-e4769a5faeba',
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private readonly fromEmail = 'WON Originals <notifications@mail.wonoriginals.online>';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  /**
   * Send Password Reset Email using the official published WON template
   */
  async sendPasswordResetEmail(toEmail: string, resetToken: string, userName = 'Member') {
    try {
      const resetUrl = `https://wonoriginals.online/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(toEmail)}`;
      const idempotencyKey = `pwd-reset-${toEmail}-${Date.now()}`;

      // 1. Try sending via published Resend Template
      const { data, error } = await this.resend.emails.send(
        {
          from: this.fromEmail,
          to: [toEmail],
          subject: 'Reset your WON Originals password',
          template: {
            id: RESEND_TEMPLATES.PASSWORD_RESET,
            variables: {
              USER_NAME: userName,
              RESET_URL: resetUrl,
            },
          },
        },
        {
          headers: {
            'X-Entity-Ref-ID': idempotencyKey,
          },
        },
      );

      if (error) {
        this.logger.warn(`Template send error: ${error.message}, falling back to direct HTML`);
        return this.sendDirectPasswordReset(toEmail, resetUrl, userName);
      }

      this.logger.log(`Password reset email dispatched to ${toEmail} (ID: ${data?.id})`);
      return { success: true, emailId: data?.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to dispatch reset email to ${toEmail}`, err);
      return { success: false, error: msg };
    }
  }

  /**
   * Direct HTML Fallback for Password Reset
   */
  private async sendDirectPasswordReset(toEmail: string, resetUrl: string, userName: string) {
    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: [toEmail],
      subject: 'Reset your WON Originals password',
      html: `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Reset your password</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; width: 100%; padding: 48px 16px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
                  <tr>
                    <td style="padding: 28px 40px; background-color: #09090b; border-bottom: 1px solid #18181b;">
                      <img src="https://iili.io/oKRgCKb.png" alt="WON Originals" width="130" style="display: block; width: 130px; max-width: 130px; height: auto; border: 0; outline: none;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 36px 40px 40px 40px;">
                      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #09090b; letter-spacing: -0.025em; line-height: 1.3;">
                        Reset your password
                      </h1>
                      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #3f3f46;">
                        Hello ${userName},
                      </p>
                      <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
                        We received a request to reset the password associated with your <strong>WON Originals</strong> account. Select the button below to choose a new password:
                      </p>
                      <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px 0;">
                        <tr>
                          <td align="center" style="border-radius: 8px; background-color: #09090b;">
                            <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 13px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; background-color: #09090b; letter-spacing: 0.01em;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a; line-height: 1.5;">
                        If the button above does not work, copy and paste this link into your browser:
                      </p>
                      <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px 14px; margin: 0 0 28px 0; word-break: break-all;">
                        <a href="${resetUrl}" target="_blank" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #09090b; text-decoration: underline; word-break: break-all; line-height: 1.5;">
                          ${resetUrl}
                        </a>
                      </div>
                      <div style="border-left: 3px solid #09090b; background-color: #f4f4f5; border-radius: 0 8px 8px 0; padding: 12px 16px;">
                        <p style="margin: 0; font-size: 13px; color: #52525b; line-height: 1.5;">
                          <strong style="color: #09090b;">Security notice:</strong> This reset link will expire in 60 minutes. If you did not make this request, you can safely ignore this email — your account remains completely secure.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f4f4f5;">
                      <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                        &copy; 2026 WeOwnNothing (WON Originals). All rights reserved.
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                        Sent securely via mail.wonoriginals.online
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, emailId: data?.id };
  }

  /**
   * Send Welcome Email using the published Resend Template
   */
  async sendWelcomeEmail(toEmail: string, memberName: string, eidNumber: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: 'Welcome to WON Originals Agency Portal',
        template: {
          id: RESEND_TEMPLATES.WELCOME_MEMBER,
          variables: {
            MEMBER_NAME: memberName,
            EID_NUMBER: eidNumber,
          },
        },
      });

      if (error) {
        this.logger.error(`Resend welcome email error: ${error.message}`, error);
        return { success: false, error: error.message };
      }

      this.logger.log(`Welcome email dispatched to ${toEmail} (ID: ${data?.id})`);
      return { success: true, emailId: data?.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Send Spark Ledger Transaction Alert
   */
  async sendSparkAlert(toEmail: string, memberName: string, sparkChange: string, reason: string, newBalance: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [toEmail],
        subject: 'Spark Ledger Update - WON Originals',
        template: {
          id: RESEND_TEMPLATES.SPARK_LEDGER_ALERT,
          variables: {
            MEMBER_NAME: memberName,
            SPARK_CHANGE: sparkChange,
            REASON: reason,
            NEW_BALANCE: newBalance,
          },
        },
      });

      if (error) {
        this.logger.error(`Resend spark alert error: ${error.message}`, error);
        return { success: false, error: error.message };
      }

      return { success: true, emailId: data?.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Send Official Agency Notice / Directive Email via Resend
   */
  async sendNoticeEmail(payload: {
    toEmails: string[];
    title: string;
    salutation?: string;
    subject?: string;
    leadStatement: string;
    bullets?: Array<{ heading?: string; bodyText: string }>;
    calloutLinkText?: string;
    signoffGreeting?: string;
    signoffTeam?: string;
    footerCopyright?: string;
    footerDisclaimer?: string;
  }) {
    try {
      const {
        toEmails,
        title,
        salutation,
        subject,
        leadStatement,
        bullets = [],
        calloutLinkText,
        signoffGreeting = 'Best regards,',
        signoffTeam = 'WON Operations Team',
        footerCopyright = '© 2026 WON LLC',
        footerDisclaimer = 'Official agency directive. Compliance is mandatory for all active workspace participants.',
      } = payload;

      if (!toEmails || toEmails.length === 0) {
        return { success: false, error: 'No recipient email addresses provided' };
      }

      const formatHtmlText = (text: string) => {
        if (!text) return '';
        let out = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
          const safeUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') ? url : `https://${url}`;
          return `<a href="${safeUrl}" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 600;">${label}</a>`;
        });
        out = out.replace(/\[([^\]]+)\]/g, `<span style="color: #2563eb; font-weight: 600;">$1</span>`);
        return out;
      };

      const htmlBody = `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title || 'WON Notice'}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; width: 100%; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);">
                  <tr>
                    <td style="padding: 32px 36px 20px 36px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                      <img src="https://iili.io/oKRgCKb.png" alt="WON" width="110" style="display: block; margin: 0 auto; width: 110px; max-width: 110px; height: auto;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 32px 36px;">
                      ${salutation ? `<p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #09090b;">${salutation}</p>` : ''}
                      ${subject ? `<p style="margin: 0 0 18px 0; font-size: 15px; font-weight: 600; color: #1e293b;">Subject: ${subject}</p>` : ''}
                      ${leadStatement ? `<p style="margin: 0 0 20px 0; font-size: 14.5px; line-height: 1.65; color: #334155;">${formatHtmlText(leadStatement)}</p>` : ''}

                      ${bullets && bullets.length > 0 ? `
                        <ul style="margin: 0 0 22px 0; padding-left: 20px; font-size: 14px; line-height: 1.65; color: #334155;">
                          ${bullets.map(b => `
                            <li style="margin-bottom: 10px;">
                              ${b.heading ? `<strong style="color: #0f172a;">${b.heading}:</strong> ` : ''}
                              ${formatHtmlText(b.bodyText)}
                            </li>
                          `).join('')}
                        </ul>
                      ` : ''}

                      ${calloutLinkText ? `
                        <div style="margin: 22px 0; padding: 12px 16px; background-color: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 6px; font-size: 13.5px; color: #166534; line-height: 1.55;">
                          ${formatHtmlText(calloutLinkText)}
                        </div>
                      ` : ''}

                      <div style="margin-top: 26px; font-size: 14px; line-height: 1.6; color: #334155;">
                        <p style="margin: 0;">${signoffGreeting}</p>
                        <p style="margin: 4px 0 0 0; font-weight: 700; color: #09090b;">${signoffTeam}</p>
                      </div>

                      <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
                        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #64748b;">${footerCopyright} • Agency Operations</p>
                        <p style="margin: 0; font-size: 11px; color: #94a3b8;">${footerDisclaimer}</p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const emailSubject = subject ? `[WON Directive] ${subject}` : `[WON Notice] ${title || 'Official Directive'}`;

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: toEmails,
        subject: emailSubject,
        html: htmlBody,
      });

      if (error) {
        this.logger.warn(`Resend domain send warning: ${error.message}, attempting onboarding fallback`);
        // Fallback to onboarding@resend.dev in case custom domain has temporary DNS hiccup
        const fallbackRes = await this.resend.emails.send({
          from: 'WON Operations <onboarding@resend.dev>',
          to: toEmails,
          subject: emailSubject,
          html: htmlBody,
        });

        if (fallbackRes.error) {
          this.logger.error(`Resend send notice fallback error: ${fallbackRes.error.message}`, fallbackRes.error);
          return { success: false, error: fallbackRes.error.message };
        }

        this.logger.log(`Notice email dispatched via fallback to ${toEmails.join(', ')} (ID: ${fallbackRes.data?.id})`);
        return { success: true, emailId: fallbackRes.data?.id, count: toEmails.length };
      }

      this.logger.log(`Notice email successfully dispatched to ${toEmails.join(', ')} (ID: ${data?.id})`);
      return { success: true, emailId: data?.id, count: toEmails.length };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send notice email`, err);
      return { success: false, error: msg };
    }
  }
}
