import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY is not configured in environment variables' },
        { status: 500 }
      );
    }

    const payload = await request.json();
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

    if (!toEmails || !Array.isArray(toEmails) || toEmails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recipient email list is empty' },
        { status: 400 }
      );
    }

    const formatHtmlText = (text: string) => {
      if (!text) return '';
      let out = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
        const safeUrl =
          url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')
            ? url
            : `https://${url}`;
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
                        ${bullets.map((b: { heading?: string; bodyText: string }) => `
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

    const emailSubject = subject
      ? `[WON Directive] ${subject}`
      : `[WON Notice] ${title || 'Official Directive'}`;

    // 1. Try sending from primary verified domain
    let res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WON Originals <notifications@mail.wonoriginals.online>',
        to: toEmails,
        subject: emailSubject,
        html: htmlBody,
      }),
    });

    let data = await res.json();

    // 2. If domain issues occur, fallback to onboarding@resend.dev
    if (!res.ok) {
      console.warn('Resend primary sender notice error:', data, 'Attempting fallback sender...');
      const fallbackRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'WON Operations <onboarding@resend.dev>',
          to: toEmails,
          subject: emailSubject,
          html: htmlBody,
        }),
      });

      const fallbackData = await fallbackRes.json();
      if (!fallbackRes.ok) {
        return NextResponse.json(
          { success: false, error: fallbackData?.message || 'Failed to dispatch via Resend' },
          { status: fallbackRes.status }
        );
      }

      return NextResponse.json({
        success: true,
        emailId: fallbackData.id,
        count: toEmails.length,
        sender: 'onboarding@resend.dev',
      });
    }

    return NextResponse.json({
      success: true,
      emailId: data.id,
      count: toEmails.length,
      sender: 'notifications@mail.wonoriginals.online',
    });
  } catch (error: any) {
    console.error('Send notice API exception:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error while sending email' },
      { status: 500 }
    );
  }
}
