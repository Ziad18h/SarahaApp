import crypto from "node:crypto";
import cs from "../../config/config.service.js";
import {
  deleteValue,
  getValue,
  setValue,
  ttl,
} from "../../DB/Redis/redis.service.js";
import { sendEmail } from "./email.service.js";
import { buildOtpEmail } from "./email.template.js";

export const OtpPurpose = {
  confirmEmail: "confirm-email",
  resetPassword: "reset-password",
  twoFactorSignIn: "two-factor-signin",
  twoFactorEnable: "two-factor-enable",
  twoFactorDisable: "two-factor-disable",
};

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const buildKey = ({ purpose, email, suffix }) =>
  `otp:${purpose}:${normalizeEmail(email)}:${suffix}`;

const otpKey = ({ purpose, email }) => buildKey({ purpose, email, suffix: "value" });
const cooldownKey = ({ purpose, email }) =>
  buildKey({ purpose, email, suffix: "cooldown" });
const requestsKey = ({ purpose, email }) =>
  buildKey({ purpose, email, suffix: "requests" });
const blockedKey = ({ purpose, email }) =>
  buildKey({ purpose, email, suffix: "blocked" });

const hashOtp = ({ email, purpose, otp }) =>
  crypto
    .createHash("sha256")
    .update(`${purpose}:${normalizeEmail(email)}:${otp}`)
    .digest("hex");

const generateOtpValue = () =>
  String(crypto.randomInt(0, 1000000)).padStart(6, "0");

export const clearOtpState = async ({ email, purpose }) => {
  return deleteValue([
    otpKey({ email, purpose }),
    cooldownKey({ email, purpose }),
    requestsKey({ email, purpose }),
    blockedKey({ email, purpose }),
  ]);
};

export const sendOtp = async ({
  email,
  purpose,
  subject,
  title,
  description,
  userName,
} = {}) => {
  const normalizedEmail = normalizeEmail(email);

  const blockedFor = await ttl(blockedKey({ email: normalizedEmail, purpose }));
  if (blockedFor > 0) {
    throw new Error(
      `Too many OTP requests. Try again in ${blockedFor} seconds`,
      { cause: 403 }
    );
  }

  const resendAfter = await ttl(cooldownKey({ email: normalizedEmail, purpose }));
  if (resendAfter > 0) {
    throw new Error(`You can request a new OTP after ${resendAfter} seconds`, {
      cause: 429,
    });
  }

  const currentRequests = Number(
    (await getValue(requestsKey({ email: normalizedEmail, purpose }))) ?? 0
  );

  if (currentRequests >= cs.otpMaxRequests) {
    await setValue({
      key: blockedKey({ email: normalizedEmail, purpose }),
      value: "blocked",
      ttl: cs.otpBlockDurationSeconds,
    });
    throw new Error("You have exceeded the maximum OTP requests", {
      cause: 403,
    });
  }

  const otp = generateOtpValue();
  await setValue({
    key: otpKey({ email: normalizedEmail, purpose }),
    value: {
      codeHash: hashOtp({ email: normalizedEmail, purpose, otp }),
      attempts: 0,
    },
    ttl: cs.emailOtpExpiresInSeconds,
  });

  await setValue({
    key: cooldownKey({ email: normalizedEmail, purpose }),
    value: "cooldown",
    ttl: cs.otpResendCooldownSeconds,
  });

  await setValue({
    key: requestsKey({ email: normalizedEmail, purpose }),
    value: currentRequests + 1,
    ttl: cs.otpBlockDurationSeconds,
  });

  await sendEmail({
    to: normalizedEmail,
    subject,
    html: buildOtpEmail({
      title,
      userName,
      description,
      otp,
      expiresInMinutes: Math.ceil(cs.emailOtpExpiresInSeconds / 60),
    }),
    text: `${description}\nOTP: ${otp}\nExpires in ${Math.ceil(
      cs.emailOtpExpiresInSeconds / 60
    )} minute(s).`,
  });

  return {
    expiresInSeconds: cs.emailOtpExpiresInSeconds,
    resendAfterSeconds: cs.otpResendCooldownSeconds,
  };
};

export const verifyOtp = async ({ email, purpose, otp } = {}) => {
  const normalizedEmail = normalizeEmail(email);
  const storedOtp = await getValue(otpKey({ email: normalizedEmail, purpose }));

  if (!storedOtp) {
    throw new Error("OTP is invalid or expired", { cause: 400 });
  }

  const expectedHash = hashOtp({ email: normalizedEmail, purpose, otp });
  if (storedOtp.codeHash !== expectedHash) {
    const remainingTtl = await ttl(otpKey({ email: normalizedEmail, purpose }));
    const nextAttempts = Number(storedOtp.attempts ?? 0) + 1;

    if (nextAttempts >= cs.otpMaxAttempts) {
      await deleteValue(otpKey({ email: normalizedEmail, purpose }));
      await setValue({
        key: blockedKey({ email: normalizedEmail, purpose }),
        value: "blocked",
        ttl: cs.otpBlockDurationSeconds,
      });
      throw new Error(
        "OTP is invalid and this action is temporarily blocked",
        { cause: 403 }
      );
    }

    await setValue({
      key: otpKey({ email: normalizedEmail, purpose }),
      value: {
        ...storedOtp,
        attempts: nextAttempts,
      },
      ttl: remainingTtl > 0 ? remainingTtl : cs.emailOtpExpiresInSeconds,
    });

    throw new Error("OTP is invalid", { cause: 400 });
  }

  await deleteValue([
    otpKey({ email: normalizedEmail, purpose }),
    cooldownKey({ email: normalizedEmail, purpose }),
  ]);

  return true;
};
