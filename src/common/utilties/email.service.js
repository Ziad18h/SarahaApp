import crypto from "node:crypto";
import nodemailer from "nodemailer";
import cs from "../../config/config.service.js";

let transporter = null;

const buildPreviewDocument = ({ to, subject, html, text }) => `
TO: ${to}
SUBJECT: ${subject}
GENERATED_AT: ${new Date().toISOString()}

${html || text || ""}
`;

const hasSmtpConfig = () =>
  Boolean(cs.emailHost && cs.emailUser && cs.emailPass);

const getTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: cs.emailHost,
      port: cs.emailPort,
      secure: cs.emailSecure,
      auth: {
        user: cs.emailUser,
        pass: cs.emailPass,
      },
    });
  }

  return transporter;
};

const sendPreviewEmail = async ({ to, subject, html, text }) => {
  const messageId = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const preview = buildPreviewDocument({ to, subject, html, text });

  console.log("Email preview generated:");
  console.log(preview);

  return {
    accepted: [to],
    rejected: [],
    messageId,
    preview,
    delivery: "preview",
  };
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const smtpTransporter = getTransporter();

  if (!smtpTransporter) {
    return sendPreviewEmail({ to, subject, html, text });
  }

  try {
    const info = await smtpTransporter.sendMail({
      from: cs.emailFrom || cs.emailUser,
      to,
      subject,
      html,
      text,
    });

    console.log(`Email sent successfully to ${to}`);

    return {
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      messageId: info.messageId,
      response: info.response,
      delivery: "smtp",
    };
  } catch (error) {
    console.error("SMTP email sending failed. Falling back to preview mode.");
    console.error(error.message);
    return sendPreviewEmail({ to, subject, html, text });
  }
};
