
type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail({ to, subject, html, idempotencyKey }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error(
      "Email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ from, to, subject, html }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected the email (${response.status}): ${detail}`);
  }

  return (await response.json()) as { id?: string };
}

export async function sendAuthEmail(input: SendEmailInput) {
  return sendEmail(input);
}

export async function sendChangeAlert({
  to,
  siteName,
  siteUrl,
  summary,
  monitorUrl,
  idempotencyKey,
}: {
  to: string;
  siteName: string;
  siteUrl: string;
  summary: string;
  monitorUrl: string;
  idempotencyKey?: string;
}) {
  const name = escapeHtml(siteName);
  const safeSummary = escapeHtml(summary);
  const safeUrl = escapeHtml(siteUrl);
  const safeMonitorUrl = escapeHtml(monitorUrl);

  return sendEmail({
    to,
    subject: `Change detected on ${siteName.replace(/[\r\n]+/g, " ")}`,
    idempotencyKey,
    html: `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0f172a">
        <p style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#6d28d9;margin:0 0 16px">ChangeRadar alert</p>
        <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">${name} changed</h1>
        <p style="font-size:15px;line-height:1.6;color:#475569;margin:0 0 20px">${safeSummary}</p>
        <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 24px">Monitored page: <a href="${safeUrl}" style="color:#6d28d9">${safeUrl}</a></p>
        <a href="${safeMonitorUrl}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600">Review the change</a>
        <p style="font-size:12px;color:#94a3b8;margin-top:32px">You are receiving this because email alerts are enabled for this monitor.</p>
      </div>
    `,
  });
}
