import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      type,                   // 'booking.created' | 'booking.rescheduled' | 'booking.cancelled'
      toEmail,
      toName,
      reference,
      service,
      date,
      time,
      name,
      email,
      phone,
      address,
      notes = '',
    } = body || {};

    // ENV
    const apiKey   = process.env.BREVO_API_KEY || '';
    const fromEmail = process.env.EMAIL_FROM || 'bookings@flitzap.com';
    const fromName  = process.env.EMAIL_FROM_NAME || 'FlitZap';
    const teamAlert = process.env.TEAM_ALERT_EMAIL || 'alerts@flitzap.com';
    const logoUrl   =
      process.env.EMAIL_LOGO_URL ||
      'https://mrdrzqkhaoqezzbxjfds.supabase.co/storage/v1/object/public/public-assets/flitzap-logo.png';

    // Build the base app URL (no trailing slash), default to production subdomain
    const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://app.flitzap.com').replace(/\/$/, '');
    const bookingUrl = `${APP_URL}/?ref=${encodeURIComponent(reference || '')}`;

    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'Missing BREVO_API_KEY' }, { status: 400 });
    }

    // Subjects
    const subjects = {
      created_customer: `Your FlitZap Booking 🟦 — ${reference}`,
      created_team:     `🟦 New Booking — ${reference}`,
      resched_customer: `Your FlitZap Booking Rescheduled 🟦 — ${reference}`,
      resched_team:     `🟦 Booking Rescheduled — ${reference}`,
      cancel_customer:  `Your FlitZap Booking Cancelled 🟥 — ${reference}`,
      cancel_team:      `🟥 Booking Cancelled — ${reference}`,
    };

    // Header line in the body
    const headers = {
      'booking.created':     'Booking Confirmed',
      'booking.rescheduled': 'Booking Rescheduled',
      'booking.cancelled':   'Booking Cancelled',
    } as const;

    const headerText =
      headers[(type as keyof typeof headers) || 'booking.created'] || 'Booking Confirmation';

    const detailsTable = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font:400 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial; color:#1a1a2e;">
        <tr><td style="padding:8px 0; width:140px; color:#4a4a4a;">Reference:</td><td style="padding:8px 0;"><strong>${reference}</strong></td></tr>
        <tr><td style="padding:8px 0; color:#4a4a4a;">Service:</td><td style="padding:8px 0;">${service}</td></tr>
        <tr><td style="padding:8px 0; color:#4a4a4a;">Date:</td><td style="padding:8px 0;">${date}</td></tr>
        <tr><td style="padding:8px 0; color:#4a4a4a;">Time:</td><td style="padding:8px 0;">${time}</td></tr>
        <tr><td style="padding:8px 0; color:#4a4a4a;">Name:</td><td style="padding:8px 0;">${name}</td></tr>
        <tr><td style="padding:8px 0; color:#4a4a4a;">Email:</td><td style="padding:8px 0;">${email}</td></tr>
        <tr><td style="padding:8px 0; color:#4a4a4a;">Phone:</td><td style="padding:8px 0;">${phone}</td></tr>
        <tr><td style="padding:8px 0; color:#4a4a4a;">Address:</td><td style="padding:8px 0;">${address}</td></tr>
        <tr><td style="padding:8px 0; color:#4a4a4a; vertical-align:top;">Notes:</td><td style="padding:8px 0;">${notes || ''}</td></tr>
      </table>
    `;

    const nextSteps = `
      <div style="margin-top:18px; padding:12px; background:#F7FBFF; border:1px solid #E5DCC5; border-radius:8px;">
        <div style="font:600 14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial; color:#1a1a2e; margin-bottom:4px;">
          Next steps
        </div>
        <div style="font:400 13px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial; color:#4a4a4a;">
          • A coordinator will call to confirm your quote.<br/>
          • You'll receive a secure payment link <em>after</em> the job is complete.
        </div>
      </div>
    `;

    // Base HTML. We pass includeCta=true for the customer email only.
    const baseHtml = (greeting: string, includeCta: boolean) => `
      <!DOCTYPE html><html><head></head>
      <body style="margin:0;padding:0;background:#f6f9fc;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f6f9fc;padding:24px 0;">
          <tr><td align="center">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#ffffff;border:1px solid #e6f0f3;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:20px 24px; text-align:center; background:#ffffff; border-bottom:1px solid #eee;">
                  <img
                    src="${logoUrl}"
                    alt="FlitZap"
                    width="160"
                    style="display:block;margin:0 auto;max-width:160px;height:auto;border:0;outline:none;text-decoration:none;"
                  />
                </td>
              </tr>

              <tr>
                <td style="padding:24px;">
                  <h1 style="margin:0 0 12px 0; font:700 20px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial; color:#1a1a2e;">
                    ${headerText}
                  </h1>
                  <p style="margin:0 0 16px 0; font:400 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial; color:#4a4a4a;">
                    ${greeting}
                  </p>

                  ${detailsTable}

                  ${
                    includeCta
                      ? `<div style="text-align:center; margin:22px 0 6px;">
                           <a href="${bookingUrl}"
                              style="display:inline-block;background:#3788da;color:#ffffff;text-decoration:none;
                                     font:600 14px/1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;
                                     padding:12px 18px;border-radius:8px;">
                             View booking
                           </a>
                         </div>`
                      : ''
                  }

                  ${type !== 'booking.cancelled' ? nextSteps : ''}
                </td>
              </tr>

              <tr>
                <td style="padding:16px 24px; border-top:1px solid #eee; color:#8a8a8a; font:400 12px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;">
                  FlitZap • (470) 604-1366 • info@flitzap.com<br/>
                  <a href="https://www.flitzap.com" style="color:#3788da;text-decoration:none;">www.flitzap.com</a>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body></html>
    `;

    // Greetings
    const greetingCustomer =
      type === 'booking.cancelled'
        ? `Hi ${toName || name}, your booking has been cancelled.`
        : `Thanks, ${toName || name}! Here are your details:`;

    const greetingTeam =
      type === 'booking.rescheduled'
        ? `Booking was rescheduled.`
        : type === 'booking.cancelled'
        ? `Booking was cancelled.`
        : `New booking received.`;

    // Payloads
    const payloadCustomer = {
      sender: { email: fromEmail, name: fromName },
      to: [{ email: toEmail || email, name: toName || name }],
      subject:
        type === 'booking.rescheduled'
          ? subjects.resched_customer
          : type === 'booking.cancelled'
          ? subjects.cancel_customer
          : subjects.created_customer,
      htmlContent: baseHtml(greetingCustomer, true), // include CTA
    };

    const payloadTeam = {
      sender: { email: fromEmail, name: fromName },
      to: [{ email: teamAlert, name: 'FlitZap Alerts' }],
      subject:
        type === 'booking.rescheduled'
          ? subjects.resched_team
          : type === 'booking.cancelled'
          ? subjects.cancel_team
          : subjects.created_team,
      htmlContent: baseHtml(greetingTeam, false), // no CTA
    };

    const resp = await Promise.all([
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        body: JSON.stringify(payloadCustomer),
      }),
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        body: JSON.stringify(payloadTeam),
      }),
    ]);

    const ok = resp.every(r => r.ok);
    if (!ok) {
      const texts = await Promise.all(resp.map(r => r.text().catch(() => '')));
      return NextResponse.json({ ok: false, error: texts }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}