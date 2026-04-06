const buildLayout = ({ title, greeting, content }) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e5e7eb;">
        <div style="margin-bottom:24px;">
          <p style="margin:0 0 12px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;">Saraha App</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">${title}</h1>
        </div>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">${greeting}</p>
        ${content}
        <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
          If you did not request this email, you can safely ignore it.
        </p>
      </div>
    </div>
  </body>
</html>
`;

export const buildOtpEmail = ({
  title,
  userName = "there",
  description,
  otp,
  expiresInMinutes,
}) =>
  buildLayout({
    title,
    greeting: `Hi ${userName},`,
    content: `
      <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">${description}</p>
      <div style="margin:24px 0;padding:18px 20px;border-radius:16px;background:#eff6ff;border:1px solid #bfdbfe;text-align:center;">
        <span style="display:block;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#1d4ed8;margin-bottom:10px;">One-Time Password</span>
        <strong style="font-size:36px;letter-spacing:.3em;color:#111827;">${otp}</strong>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.7;">This code expires in ${expiresInMinutes} minute(s).</p>
    `,
  });
