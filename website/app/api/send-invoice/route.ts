import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY is not configured in environment variables' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      toEmail,
      receiptRef,
      type = 'RELEASE',
      status = 'RELEASED',
      date,
      title,
      amount,
      category,
      usedBy,
      workProject,
      notes,
      proofUrl,
      approvedBy,
      verifyUrl,
    } = body;

    if (!toEmail || typeof toEmail !== 'string' || !toEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid recipient email address' },
        { status: 400 }
      );
    }

    const formattedAmount = `₹${Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const docLabel =
      type === 'DEPOSIT'
        ? 'DEPOSIT RECEIPT'
        : type === 'REQUEST'
        ? 'FUND REQUEST RECEIPT'
        : 'INVOICE / RELEASE RECEIPT';

    const personLabel =
      type === 'DEPOSIT' ? 'Deposited By' : type === 'REQUEST' ? 'Requested By' : 'Issued To';

    let qrDataUrl = '';
    if (verifyUrl) {
      try {
        qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 110, margin: 1 });
      } catch {
        qrDataUrl = '';
      }
    }

    const htmlBody = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${docLabel} ${receiptRef || ''}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; width: 100%; padding: 36px 16px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);">
                <tr>
                  <td style="padding: 32px 36px 24px 36px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="top">
                          <img src="https://iili.io/oKRgCKb.png" alt="WON" width="96" style="display: block; width: 96px; height: auto; margin-bottom: 8px;" />
                          <p style="margin: 0; font-size: 12px; color: #64748b;">WON Agency • Operations &amp; Finance</p>
                        </td>
                        <td align="right" valign="top">
                          <p style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 0.04em; color: #0f172a;">${docLabel}</p>
                          <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 12px; font-weight: 700; color: #087fc4;">${receiptRef || 'ITR-WON'}</p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Date: ${date || '-'}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 24px 36px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                      <tr>
                        <td width="50%" valign="top" style="padding: 16px 18px; border-right: 1px solid #e2e8f0;">
                          <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;">${personLabel}</p>
                          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${usedBy || 'Agency Member'}</p>
                          <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${toEmail}</p>
                        </td>
                        <td width="50%" valign="top" style="padding: 16px 18px;">
                          <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;">Project &amp; Category</p>
                          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #087fc4;">${workProject || 'General Operations'}</p>
                          <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${category || 'General'}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 36px 24px 36px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                      <thead>
                        <tr style="background-color: #f1f5f9;">
                          <th align="left" style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0;">Description</th>
                          <th align="center" style="padding: 12px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0;">Qty</th>
                          <th align="right" style="padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0;">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style="padding: 16px; border-bottom: 1px solid #f1f5f9;">
                            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${title || 'Transaction Item'}</p>
                            ${notes ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${notes}</p>` : ''}
                            ${proofUrl ? `<p style="margin: 4px 0 0 0; font-size: 11px; font-family: monospace; color: #087fc4;">Ref: ${proofUrl}</p>` : ''}
                          </td>
                          <td align="center" valign="top" style="padding: 16px 12px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">1</td>
                          <td align="right" valign="top" style="padding: 16px; font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${formattedAmount}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 36px 28px 36px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="55%" valign="middle">
                          <span style="display: inline-block; padding: 6px 12px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 999px; font-size: 11px; font-weight: 700; color: #047857;">
                            STATUS: ${status} • ${approvedBy ? `By ${approvedBy}` : 'Verified'}
                          </span>
                          ${qrDataUrl ? `
                            <div style="margin-top: 12px;">
                              <img src="${qrDataUrl}" alt="QR Verify" width="88" height="88" style="display: block; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; background: #fff;" />
                              <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b;">Scan QR or <a href="${verifyUrl}" style="color: #087fc4;">verify online</a></p>
                            </div>
                          ` : ''}
                        </td>
                        <td width="45%" align="right" valign="top">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding: 4px 0; font-size: 12px; color: #64748b;">Subtotal</td>
                              <td align="right" style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #0f172a;">${formattedAmount}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0 0 0; font-size: 14px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0;">Total</td>
                              <td align="right" style="padding: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #087fc4; border-top: 1px solid #e2e8f0;">${formattedAmount}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 18px 36px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; font-weight: 600; color: #64748b;">&copy; 2026 WON • Official Verified Receipt</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const subject = `[WON ${receiptRef || 'Receipt'}] ${title || docLabel} (${formattedAmount})`;

    let res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WON Originals <notifications@mail.wonoriginals.online>',
        to: [toEmail],
        subject,
        html: htmlBody,
      }),
    });

    let data = await res.json();

    if (!res.ok) {
      const fallbackRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'WON Operations <onboarding@resend.dev>',
          to: [toEmail],
          subject,
          html: htmlBody,
        }),
      });
      const fallbackData = await fallbackRes.json();
      if (!fallbackRes.ok) {
        return NextResponse.json(
          { success: false, error: fallbackData?.message || 'Failed to send invoice email' },
          { status: fallbackRes.status }
        );
      }
      return NextResponse.json({ success: true, emailId: fallbackData.id });
    }

    return NextResponse.json({ success: true, emailId: data.id });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal error sending invoice' },
      { status: 500 }
    );
  }
}
