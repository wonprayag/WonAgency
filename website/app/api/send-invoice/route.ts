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
                  <td style="padding: 24px 22px 20px 22px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="top" style="padding-right: 12px;">
                          <img src="https://iili.io/oKRgCKb.png" alt="WON" width="90" style="display: block; width: 90px; height: auto; margin-bottom: 8px;" />
                          <p style="margin: 0; font-size: 11.5px; color: #64748b;">WON Agency • Operations &amp; Finance</p>
                        </td>
                        <td align="right" valign="top">
                          <p style="margin: 0; font-size: 16px; font-weight: 800; letter-spacing: 0.03em; color: #0f172a; line-height: 1.25;">${docLabel}</p>
                          <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 11.5px; font-weight: 700; color: #087fc4;">${receiptRef || 'ITR-WON'}</p>
                          <p style="margin: 4px 0 0 0; font-size: 11.5px; color: #64748b;">Date: ${date || '-'}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 18px 22px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                      <tr>
                        <td width="52%" valign="top" style="padding: 14px 14px; border-right: 1px solid #e2e8f0; word-break: break-word; overflow-wrap: anywhere;">
                          <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;">${personLabel}</p>
                          <p style="margin: 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">${usedBy || 'Agency Member'}</p>
                          <p style="margin: 3px 0 0 0; font-size: 11.5px; color: #64748b; word-break: break-all;">${toEmail}</p>
                        </td>
                        <td width="48%" valign="top" style="padding: 14px 14px; word-break: break-word;">
                          <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;">Project &amp; Category</p>
                          <p style="margin: 0; font-size: 13.5px; font-weight: 700; color: #087fc4;">${workProject || 'General Operations'}</p>
                          ${category && category.trim().toLowerCase() !== (workProject || 'General Operations').trim().toLowerCase()
                            ? `<p style="margin: 3px 0 0 0; font-size: 11.5px; color: #64748b;">${category}</p>`
                            : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 22px 20px 22px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                      <thead>
                        <tr style="background-color: #f1f5f9;">
                          <th align="left" style="padding: 11px 14px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0;">Description</th>
                          <th align="center" style="padding: 11px 10px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0;">Qty</th>
                          <th align="right" style="padding: 11px 14px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0;">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style="padding: 14px; border-bottom: 1px solid #f1f5f9;">
                            <p style="margin: 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">${title || 'Transaction Item'}</p>
                            ${notes && notes.trim().toLowerCase() !== (title || '').trim().toLowerCase() ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${notes}</p>` : ''}
                            ${proofUrl ? `<p style="margin: 4px 0 0 0; font-size: 11px; font-family: monospace; color: #087fc4; word-break: break-all;">Ref: ${proofUrl}</p>` : ''}
                          </td>
                          <td align="center" valign="top" style="padding: 14px 10px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">1</td>
                          <td align="right" valign="top" style="padding: 14px; font-size: 13.5px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">${formattedAmount}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 22px 24px 22px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="54%" valign="top" style="padding-right: 14px;">
                          <div style="display: inline-block; padding: 6px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; font-size: 10.5px; font-weight: 700; line-height: 1.4; color: #047857;">
                            STATUS: ${status} • ${approvedBy ? `By ${approvedBy}` : 'Verified'}
                          </div>
                          ${(qrDataUrl || verifyUrl || receiptRef) ? (() => {
                            const qrTargetUrl = verifyUrl || `https://app.wonoriginals.online/verify/${encodeURIComponent(receiptRef || 'WON')}`;
                            const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=176x176&margin=6&bgcolor=ffffff&color=0f172a&data=${encodeURIComponent(qrTargetUrl)}`;
                            return `
                            <div style="margin-top: 12px;">
                              <img src="${qrImageSrc}" alt="QR Verify" width="84" height="84" style="display: block; width: 84px; height: 84px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; background-color: #ffffff;" />
                              <p style="margin: 5px 0 0 0; font-size: 10px; color: #64748b;">Scan QR or <a href="${qrTargetUrl}" style="color: #087fc4;">verify online</a></p>
                            </div>
                          `;
                          })() : ''}
                        </td>
                        <td width="46%" align="right" valign="top" style="padding-left: 14px; border-left: 1px solid #f1f5f9;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding: 4px 8px 4px 0; font-size: 12px; color: #64748b;">Subtotal</td>
                              <td align="right" style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #0f172a; white-space: nowrap;">${formattedAmount}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 8px 0 0; font-size: 13.5px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0;">Total</td>
                              <td align="right" style="padding: 8px 0 0 0; font-size: 17px; font-weight: 800; color: #087fc4; border-top: 1px solid #e2e8f0; white-space: nowrap;">${formattedAmount}</td>
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

    const subject = `WON Receipt ${receiptRef ? `${receiptRef} — ` : ''}${title || docLabel} (${formattedAmount})`;
    const qrVerifyLink = verifyUrl || `https://app.wonoriginals.online/verify/${encodeURIComponent(receiptRef || 'WON')}`;
    const textBody = [
      `WON Agency - ${docLabel}`,
      `Receipt Ref: ${receiptRef || 'ITR-WON'}`,
      `Date: ${date || '-'}`,
      `${personLabel}: ${usedBy || 'Agency Member'} (${toEmail})`,
      `Project & Category: ${workProject || 'General Operations'} (${category || 'General'})`,
      `Item: ${title || 'Transaction Item'} - ${formattedAmount}`,
      notes ? `Notes: ${notes}` : '',
      `Status: ${status} (${approvedBy ? `By ${approvedBy}` : 'Verified'})`,
      `Verify online: ${qrVerifyLink}`,
      '',
      '© 2026 WON • Official Verified Receipt',
    ]
      .filter(Boolean)
      .join('\n');

    let res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WON Originals <notifications@mail.wonoriginals.online>',
        reply_to: 'WON Originals <notifications@mail.wonoriginals.online>',
        to: [toEmail],
        subject,
        html: htmlBody,
        text: textBody,
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
          reply_to: 'WON Originals <notifications@mail.wonoriginals.online>',
          to: [toEmail],
          subject,
          html: htmlBody,
          text: textBody,
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
