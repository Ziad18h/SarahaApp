import joi from "joi";
import { GenderEnum } from "../../common/enum/user.enum.js";

const emailSchema = joi.string().email().trim().lowercase().required();
const objectIdSchema = joi.string().trim().hex().length(24).required();
const otpSchema = joi
  .string()
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    "string.pattern.base": "otp must be a 6 digit code",
  });

const publicOtpPurposeSchema = joi
  .string()
  .valid("confirm-email", "reset-password")
  .required();

export const signupSchema = {
  body: joi
    .object({
      userName: joi.string().min(3).max(60).required(),
      email: emailSchema,
      password: joi.string().min(8).required().messages({
        "string.min": "password cannot be less than 8 characters",
      }),
      age: joi.number().integer().min(13).max(100).optional(),
      gender: joi
        .string()
        .valid(...Object.values(GenderEnum))
        .optional(),
      phone: joi
        .string()
        .pattern(/^\+?\d{8,15}$/)
        .required()
        .messages({
          "string.pattern.base": "phone must be a valid phone number",
        }),
    })
    .required(),
};

export const googleSignupSchema = {
  body: joi
    .object({
      idToken: joi.string().required(),
    })
    .required(),
};

export const signinSchema = {
  body: joi
    .object({
      email: emailSchema,
      password: joi.string().required(),
    })
    .required(),
};

export const verifyTwoFactorSchema = {
  body: joi
    .object({
      challengeToken: joi.string().required(),
      otp: otpSchema,
    })
    .required(),
};

export const confirmEmailSchema = {
  body: joi
    .object({
      email: emailSchema,
      otp: otpSchema,
    })
    .required(),
};

export const resendConfirmationSchema = {
  body: joi
    .object({
      email: emailSchema,
    })
    .required(),
};

export const forgotPasswordSchema = {
  body: joi
    .object({
      email: emailSchema,
    })
    .required(),
};

export const resetPasswordSchema = {
  body: joi
    .object({
      email: emailSchema,
      otp: otpSchema,
      password: joi.string().min(8).required(),
      confirmPassword: joi.valid(joi.ref("password")).required().messages({
        "any.only": "confirmPassword must match password",
      }),
    })
    .required(),
};

export const sendPublicOtpSchema = {
  body: joi
    .object({
      email: emailSchema,
      purpose: publicOtpPurposeSchema,
    })
    .required(),
};

export const verifyPublicOtpSchema = {
  body: joi
    .object({
      email: emailSchema,
      purpose: publicOtpPurposeSchema,
      otp: otpSchema,
    })
    .required(),
};

export const sendTwoFactorOtpSchema = {
  body: joi
    .object({
      action: joi.string().valid("enable", "disable").default("enable"),
    })
    .required(),
};

export const toggleTwoFactorSchema = {
  body: joi
    .object({
      otp: otpSchema,
    })
    .required(),
};

export const revokeTokenSchema = {
  body: joi
    .object({
      token: joi.string().optional(),
    })
    .required(),
};

export const shareLinkParamsSchema = {
  params: joi
    .object({
      shareLink: joi.string().trim().required(),
    })
    .required(),
};

export const userIdParamsSchema = {
  params: joi
    .object({
      userId: objectIdSchema,
    })
    .required(),
};

export const banUserSchema = {
  body: joi
    .object({
      reason: joi.string().min(3).max(200).required(),
      durationMinutes: joi.number().integer().min(1).max(60 * 24 * 365).optional(),
    })
    .required(),
};
