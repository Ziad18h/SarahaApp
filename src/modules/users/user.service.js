import fs from "node:fs/promises";
import path from "node:path";
import { OAuth2Client } from "google-auth-library";
import userModel from "../../DB/models/user.model.js";
import cs from "../../config/config.service.js";
import { successRespose } from "../../common/utilties/response.success.js";
import cloudinary from "../../common/utilties/cloudinary.js";
import {
  sendOtp,
  verifyOtp,
  OtpPurpose,
} from "../../common/utilties/otp.service.js";
import {
  generateAccessToken,
  generateChallengeToken,
  VerfiyToken,
} from "../../common/utilties/token.service.js";
import {
  registerSession,
  revokeAccessToken,
  revokeAllUserSessions,
} from "../../common/utilties/session.service.js";
import {
  decrypt,
  encrypt,
} from "../../common/utilties/security/encrypt.security.js";
import { Compare, hash } from "../../common/utilties/security/hash.security.js";
import { ProviderEnum } from "../../common/enum/user.enum.js";

const googleClient = new OAuth2Client(cs.googleClientId);

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const sanitizeUser = (user) => {
  const plainUser = user.toObject ? user.toObject() : { ...user };
  delete plainUser.password;
  plainUser.phone = plainUser.phone ? decrypt(plainUser.phone) : plainUser.phone;

  return {
    ...plainUser,
    shareUrl: `${cs.appBaseUrl}/users/public/${plainUser.shareLink}`,
  };
};

const splitUserName = (userName = "") => {
  const fullName = userName.trim();
  const [firstName, ...rest] = fullName.split(" ").filter(Boolean);
  const lastName = rest.join(" ").trim();

  if (!firstName || !lastName) {
    throw new Error("userName must include first and last name", { cause: 400 });
  }

  return { firstName, lastName };
};

const removeLocalFile = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to remove local file", error);
    }
  }
};

const buildDefaultProfilePicture = ({ userName, email }) => ({
  secure_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userName || email || "Saraha User"
  )}`,
  public_id: `default-${email || Date.now()}`,
});

const buildLocalProfilePicture = (filePath) => {
  if (!filePath) {
    return null;
  }

  const filesRoot = path.resolve("files");
  const relativePath = path.relative(filesRoot, filePath);

  if (!relativePath || relativePath.startsWith("..")) {
    return null;
  }

  const normalizedPath = relativePath.split(path.sep).join("/");

  return {
    secure_url: `${cs.appBaseUrl}/files/${normalizedPath}`,
    public_id: `local-${normalizedPath}`,
  };
};

const uploadWithTimeout = (filePath) =>
  Promise.race([
    cloudinary.uploader.upload(filePath, {
      folder: `${cs.cloudinaryFolder}/users`,
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Cloudinary upload timeout")), 8000)
    ),
  ]);

const uploadProfilePicture = async ({ file, userName, email }) => {
  if (!file?.path) {
    return buildDefaultProfilePicture({ userName, email });
  }

  const hasCloudinaryConfig = Boolean(
    cs.cloudinaryCloudName && cs.cloudinaryApiKey && cs.cloudinaryApiSecret
  );

  if (hasCloudinaryConfig) {
    try {
      const uploadedFile = await uploadWithTimeout(file.path);
      await removeLocalFile(file.path);

      return {
        secure_url: uploadedFile.secure_url,
        public_id: uploadedFile.public_id,
      };
    } catch (error) {
      console.warn(
        "Cloudinary upload failed. Falling back to local file storage.",
        error.message
      );
    }
  }

  const localProfilePicture = buildLocalProfilePicture(file.path);
  if (localProfilePicture) {
    return localProfilePicture;
  }

  await removeLocalFile(file.path);
  return buildDefaultProfilePicture({ userName, email });
};

const issueAccessToken = async (user) => {
  const { token, sessionId } = generateAccessToken({ user });
  await registerSession({
    userId: user._id.toString(),
    sessionId,
    token,
    metadata: {
      email: user.email,
    },
  });

  return token;
};

const buildGooglePicture = (picture, email) => {
  return {
    secure_url:
      picture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}`,
    public_id: `google-${email}`,
  };
};

const clearBanState = async (user) => {
  user.isBanned = false;
  user.banReason = null;
  user.bannedAt = null;
  user.banExpiresAt = null;
  user.bannedBy = null;
  await user.save();
  return user;
};

const assertUserIsNotBanned = async (user) => {
  if (!user?.isBanned) {
    return;
  }

  if (user.banExpiresAt && user.banExpiresAt <= new Date()) {
    await clearBanState(user);
    return;
  }

  const untilMessage = user.banExpiresAt
    ? ` until ${user.banExpiresAt.toISOString()}`
    : "";

  throw new Error(`user is banned${untilMessage}`, { cause: 403 });
};

const createTwoFactorChallenge = async (user) => {
  await sendOtp({
    email: user.email,
    purpose: OtpPurpose.twoFactorSignIn,
    subject: "Saraha sign in verification",
    title: "Sign in verification",
    description: "Use this OTP to complete your sign in.",
    userName: user.userName,
  });

  return generateChallengeToken({
    user,
    purpose: OtpPurpose.twoFactorSignIn,
  });
};

const sendConfirmationOtp = async (user) => {
  return sendOtp({
    email: user.email,
    purpose: OtpPurpose.confirmEmail,
    subject: "Confirm your Saraha account",
    title: "Confirm your email",
    description:
      "Use this OTP to confirm your email address and activate your account.",
    userName: user.userName,
  });
};

const sendForgotPasswordOtp = async (user) => {
  return sendOtp({
    email: user.email,
    purpose: OtpPurpose.resetPassword,
    subject: "Reset your Saraha password",
    title: "Reset password request",
    description: "Use this OTP to reset your password securely.",
    userName: user.userName,
  });
};

const sendTwoFactorPurposeOtp = async (user, purpose, actionLabel) => {
  return sendOtp({
    email: user.email,
    purpose,
    subject: `Saraha ${actionLabel} OTP`,
    title: `${actionLabel} OTP`,
    description: `Use this OTP to ${actionLabel.toLowerCase()} on your account.`,
    userName: user.userName,
  });
};

const verifyGoogleAccount = async (idToken) => {
  try {
    return await googleClient.verifyIdToken({
      idToken,
      audience: cs.googleClientId,
    });
  } catch (error) {
    console.warn("Google token verification failed:", error.message);
    throw new Error("invalid google token", { cause: 401 });
  }
};

const resolvePublicOtpUser = async ({ email, purpose }) => {
  const normalizedEmail = normalizeEmail(email);

  switch (purpose) {
    case OtpPurpose.confirmEmail: {
      const user = await userModel.findOne({
        email: normalizedEmail,
        provider: ProviderEnum.system,
      });

      if (!user) {
        throw new Error("user not found", { cause: 404 });
      }

      if (user.confirmed) {
        throw new Error("email already confirmed", { cause: 400 });
      }

      return user;
    }

    case OtpPurpose.resetPassword: {
      const user = await userModel.findOne({
        email: normalizedEmail,
        provider: ProviderEnum.system,
      });

      if (!user) {
        throw new Error("user not found", { cause: 404 });
      }

      return user;
    }

    default:
      throw new Error("unsupported otp purpose", { cause: 400 });
  }
};

export const signup = async (req, res, next) => {
  const { userName, email, password, age, gender, phone } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const { firstName, lastName } = splitUserName(userName);

  const existingUser = await userModel.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new Error("email already exists", { cause: 409 });
  }

  const profilePicture = await uploadProfilePicture({
    file: req.file,
    userName,
    email: normalizedEmail,
  });

  const user = await userModel.create({
    firstName,
    lastName,
    email: normalizedEmail,
    password: hash({ plaintext: password }),
    age,
    gender,
    phone: encrypt(phone),
    provider: ProviderEnum.system,
    confirmed: false,
    profilePicture,
    coverPicture: profilePicture ? [profilePicture] : [],
  });

  await sendConfirmationOtp(user);

  successRespose({
    res,
    status: 201,
    message: "user created successfully, please confirm your email",
    data: sanitizeUser(user),
  });
};

export const signupWithGmail = async (req, res, next) => {
  const { idToken } = req.body;
  if (!cs.googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured", { cause: 500 });
  }

  const ticket = await verifyGoogleAccount(idToken);

  const payload = ticket.getPayload();
  const normalizedEmail = normalizeEmail(payload?.email);

  if (!normalizedEmail) {
    throw new Error("Unable to read google account email", { cause: 400 });
  }

  const googleProfile = splitUserName(payload?.name || `${normalizedEmail} User`);
  let user = await userModel.findOne({ email: normalizedEmail });

  if (!user) {
    user = await userModel.create({
      ...googleProfile,
      email: normalizedEmail,
      confirmed: Boolean(payload?.email_verified),
      profilePicture: buildGooglePicture(payload?.picture, normalizedEmail),
      provider: ProviderEnum.google,
    });
  }

  if (user.provider === ProviderEnum.system) {
    throw new Error("Sign in with your email and password", { cause: 400 });
  }

  await assertUserIsNotBanned(user);

  if (user.twoFactorEnabled) {
    const challengeToken = await createTwoFactorChallenge(user);

    return successRespose({
      res,
      message: "two factor otp sent successfully",
      data: {
        twoFactorRequired: true,
        challengeToken,
      },
    });
  }

  const access_token = await issueAccessToken(user);

  successRespose({
    res,
    status: 200,
    message: "signed in successfully",
    data: { access_token },
  });
};

export const sendPublicOtp = async (req, res, next) => {
  const { email, purpose } = req.body;
  const user = await resolvePublicOtpUser({ email, purpose });

  if (purpose === OtpPurpose.confirmEmail) {
    await sendConfirmationOtp(user);
  } else if (purpose === OtpPurpose.resetPassword) {
    await sendForgotPasswordOtp(user);
  }

  successRespose({
    res,
    message: "otp sent successfully",
    data: {
      purpose,
      email: user.email,
    },
  });
};

export const verifyPublicOtp = async (req, res, next) => {
  const { email, purpose, otp } = req.body;
  await resolvePublicOtpUser({ email, purpose });
  await verifyOtp({
    email,
    purpose,
    otp,
  });

  successRespose({
    res,
    message: "otp verified successfully",
    data: {
      purpose,
      email: normalizeEmail(email),
      verified: true,
    },
  });
};

export const confirmEmail = async (req, res, next) => {
  const { email, otp } = req.body;
  const normalizedEmail = normalizeEmail(email);

  const user = await userModel.findOne({
    email: normalizedEmail,
    provider: ProviderEnum.system,
  });

  if (!user) {
    throw new Error("user not found", { cause: 404 });
  }

  if (user.confirmed) {
    throw new Error("email already confirmed", { cause: 400 });
  }

  await verifyOtp({
    email: normalizedEmail,
    purpose: OtpPurpose.confirmEmail,
    otp,
  });

  user.confirmed = true;
  await user.save();

  successRespose({
    res,
    message: "email confirmed successfully",
    data: sanitizeUser(user),
  });
};

export const resendConfirmationOtp = async (req, res, next) => {
  const normalizedEmail = normalizeEmail(req.body.email);
  const user = await userModel.findOne({
    email: normalizedEmail,
    provider: ProviderEnum.system,
  });

  if (!user) {
    throw new Error("user not found", { cause: 404 });
  }

  if (user.confirmed) {
    throw new Error("email already confirmed", { cause: 400 });
  }

  await sendConfirmationOtp(user);

  successRespose({
    res,
    message: "confirmation otp sent successfully",
  });
};

export const signin = async (req, res, next) => {
  const normalizedEmail = normalizeEmail(req.body.email);
  const { password } = req.body;

  const user = await userModel.findOne({
    email: normalizedEmail,
    provider: ProviderEnum.system,
  });

  if (!user) {
    throw new Error("user not found", { cause: 404 });
  }

  await assertUserIsNotBanned(user);

  if (!Compare({ plaintext: password, ciphertext: user.password })) {
    throw new Error("wrong password", { cause: 401 });
  }

  if (!user.confirmed) {
    throw new Error("please confirm your email first", { cause: 403 });
  }

  if (user.twoFactorEnabled) {
    const challengeToken = await createTwoFactorChallenge(user);

    return successRespose({
      res,
      message: "two factor otp sent successfully",
      data: {
        twoFactorRequired: true,
        challengeToken,
      },
    });
  }

  const access_token = await issueAccessToken(user);

  successRespose({
    res,
    message: "welcome back",
    data: { access_token },
  });
};

export const verifyTwoFactorSignin = async (req, res, next) => {
  const { challengeToken, otp } = req.body;

  let decodedChallenge;
  try {
    decodedChallenge = VerfiyToken({ token: challengeToken });
  } catch (error) {
    throw new Error("invalid challenge token", { cause: 401 });
  }

  if (
    decodedChallenge.type !== "challenge" ||
    decodedChallenge.purpose !== OtpPurpose.twoFactorSignIn
  ) {
    throw new Error("invalid challenge token", { cause: 401 });
  }

  const user = await userModel.findById(decodedChallenge.id);
  if (!user) {
    throw new Error("user not found", { cause: 404 });
  }

  await assertUserIsNotBanned(user);

  await verifyOtp({
    email: user.email,
    purpose: OtpPurpose.twoFactorSignIn,
    otp,
  });

  const access_token = await issueAccessToken(user);

  successRespose({
    res,
    message: "signed in successfully",
    data: { access_token },
  });
};

export const forgotPassword = async (req, res, next) => {
  const normalizedEmail = normalizeEmail(req.body.email);
  const user = await userModel.findOne({
    email: normalizedEmail,
    provider: ProviderEnum.system,
  });

  if (user) {
    await sendForgotPasswordOtp(user);
  }

  successRespose({
    res,
    message: "if the email exists, a reset otp has been sent",
  });
};

export const resetPassword = async (req, res, next) => {
  const { email, otp, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  const user = await userModel.findOne({
    email: normalizedEmail,
    provider: ProviderEnum.system,
  });

  if (!user) {
    throw new Error("user not found", { cause: 404 });
  }

  await verifyOtp({
    email: normalizedEmail,
    purpose: OtpPurpose.resetPassword,
    otp,
  });

  user.password = hash({ plaintext: password });
  user.tokenVersion += 1;
  await user.save();
  await revokeAllUserSessions(user._id.toString());

  successRespose({
    res,
    message: "password reset successfully",
  });
};

export const sendTwoFactorOtp = async (req, res, next) => {
  await assertUserIsNotBanned(req.user);

  const action = req.body.action || "enable";
  const purpose =
    action === "disable"
      ? OtpPurpose.twoFactorDisable
      : OtpPurpose.twoFactorEnable;

  await sendTwoFactorPurposeOtp(
    req.user,
    purpose,
    action === "disable" ? "Disable two factor" : "Enable two factor"
  );

  successRespose({
    res,
    message: `two factor ${action} otp sent successfully`,
  });
};

export const enableTwoFactor = async (req, res, next) => {
  await assertUserIsNotBanned(req.user);

  await verifyOtp({
    email: req.user.email,
    purpose: OtpPurpose.twoFactorEnable,
    otp: req.body.otp,
  });

  req.user.twoFactorEnabled = true;
  await req.user.save();

  successRespose({
    res,
    message: "two factor verification enabled successfully",
    data: {
      twoFactorEnabled: req.user.twoFactorEnabled,
    },
  });
};

export const disableTwoFactor = async (req, res, next) => {
  await assertUserIsNotBanned(req.user);

  await verifyOtp({
    email: req.user.email,
    purpose: OtpPurpose.twoFactorDisable,
    otp: req.body.otp,
  });

  req.user.twoFactorEnabled = false;
  await req.user.save();

  successRespose({
    res,
    message: "two factor verification disabled successfully",
    data: {
      twoFactorEnabled: req.user.twoFactorEnabled,
    },
  });
};

export const logout = async (req, res, next) => {
  await revokeAccessToken({
    token: req.token,
    decodedPayload: req.auth,
    reason: "logout",
  });

  successRespose({
    res,
    message: "logged out successfully",
  });
};

export const logoutAllDevices = async (req, res, next) => {
  req.user.tokenVersion += 1;
  await req.user.save();

  await revokeAllUserSessions(req.user._id.toString());
  await revokeAccessToken({
    token: req.token,
    decodedPayload: req.auth,
    reason: "logout-all-devices",
  });

  successRespose({
    res,
    message: "logged out from all devices successfully",
  });
};

export const revokeToken = async (req, res, next) => {
  const tokenToRevoke = req.body.token || req.token;

  let decodedToken;
  try {
    decodedToken = VerfiyToken({ token: tokenToRevoke });
  } catch (error) {
    throw new Error("invalid token", { cause: 400 });
  }

  if (
    decodedToken.id !== req.user._id.toString() &&
    req.user.Roles !== "admin"
  ) {
    throw new Error("you are not allowed to revoke this token", { cause: 403 });
  }

  await revokeAccessToken({
    token: tokenToRevoke,
    decodedPayload: decodedToken,
    reason: "manual-revoke",
  });

  successRespose({
    res,
    message: "token revoked successfully",
  });
};

export const banUser = async (req, res, next) => {
  const { userId } = req.params;
  const { reason, durationMinutes } = req.body;

  if (req.user._id.toString() === userId) {
    throw new Error("you cannot ban yourself", { cause: 400 });
  }

  const user = await userModel.findById(userId);
  if (!user) {
    throw new Error("user not found", { cause: 404 });
  }

  user.isBanned = true;
  user.banReason = reason;
  user.bannedAt = new Date();
  user.banExpiresAt = durationMinutes
    ? new Date(Date.now() + durationMinutes * 60 * 1000)
    : null;
  user.bannedBy = req.user._id;
  user.tokenVersion += 1;
  await user.save();
  await revokeAllUserSessions(user._id.toString());

  successRespose({
    res,
    message: "user banned successfully",
    data: {
      userId: user._id,
      isBanned: user.isBanned,
      banReason: user.banReason,
      banExpiresAt: user.banExpiresAt,
    },
  });
};

export const unbanUser = async (req, res, next) => {
  const { userId } = req.params;

  const user = await userModel.findById(userId);
  if (!user) {
    throw new Error("user not found", { cause: 404 });
  }

  if (!user.isBanned) {
    throw new Error("user is not banned", { cause: 400 });
  }

  await clearBanState(user);

  successRespose({
    res,
    message: "user unbanned successfully",
    data: {
      userId: user._id,
      isBanned: false,
    },
  });
};

export const getProfile = async (req, res, next) => {
  await assertUserIsNotBanned(req.user);
  const user = await userModel.findById(req.user._id).select("-password");

  successRespose({
    res,
    message: "profile fetched successfully",
    data: {
      ...sanitizeUser(user),
      visitMessage: `${user.visitCount}`,
    },
  });
};

export const getMyVisits = async (req, res, next) => {
  await assertUserIsNotBanned(req.user);
  const user = await userModel.findById(req.user._id).select(
    "visitCount lastVisit"
  );

  successRespose({
    res,
    message: "visits statistics",
    data: {
      visitCount: user.visitCount,
      lastVisit: user.lastVisit,
      message: `You have visited your profile ${user.visitCount} times`,
    },
  });
};

export const getShareLink = async (req, res, next) => {
  await assertUserIsNotBanned(req.user);

  successRespose({
    res,
    message: "share link fetched successfully",
    data: {
      shareLink: req.user.shareLink,
      shareUrl: `${cs.appBaseUrl}/users/public/${req.user.shareLink}`,
    },
  });
};

export const getPublicProfile = async (req, res, next) => {
  const user = await userModel
    .findOne({
      shareLink: req.params.shareLink,
      confirmed: true,
      isBanned: false,
    })
    .select("firstName lastName userName profilePicture shareLink");

  if (!user) {
    throw new Error("user not found", { cause: 404 });
  }

  successRespose({
    res,
    message: "public profile fetched successfully",
    data: {
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      profilePicture: user.profilePicture,
      shareLink: user.shareLink,
      shareUrl: `${cs.appBaseUrl}/users/public/${user.shareLink}`,
    },
  });
};
