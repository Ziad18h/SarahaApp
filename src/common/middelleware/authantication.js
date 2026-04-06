import userModel from "../../DB/models/user.model.js";
import {
  isSessionActive,
  isSessionBlacklisted,
} from "../utilties/session.service.js";
import { VerfiyToken } from "../utilties/token.service.js";

const clearExpiredBanState = async (user) => {
  user.isBanned = false;
  user.banReason = null;
  user.bannedAt = null;
  user.banExpiresAt = null;
  user.bannedBy = null;
  await user.save();
};

export const authantication = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    throw new Error("token does not exist", { cause: 401 });
  }

  const [scheme, rawToken] = auth.split(" ");
  const token = rawToken ? rawToken.trim() : auth.trim();

  if (rawToken && !/^bearer$/i.test(scheme)) {
    throw new Error("invalid token prefix", { cause: 401 });
  }

  let decoded;
  try {
    decoded = VerfiyToken({ token });
  } catch (error) {
    throw new Error("invalid token", { cause: 401 });
  }

  if (!decoded?.id || decoded.type !== "access") {
    throw new Error("invalid token", { cause: 401 });
  }

  if (await isSessionBlacklisted(decoded.sid)) {
    throw new Error("token revoked", { cause: 401 });
  }

  const user = await userModel.findById(decoded.id).select("-password");

  if (!user) {
    throw new Error("user not found", { cause: 404 });
  }

  if (user.isBanned) {
    if (user.banExpiresAt && user.banExpiresAt <= new Date()) {
      await clearExpiredBanState(user);
    } else {
      const untilMessage = user.banExpiresAt
        ? ` until ${user.banExpiresAt.toISOString()}`
        : "";
      throw new Error(`user is banned${untilMessage}`, { cause: 403 });
    }
  }

  if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    throw new Error("session has been revoked from all devices", { cause: 401 });
  }

  const hasActiveSession = await isSessionActive({
    userId: user._id.toString(),
    sessionId: decoded.sid,
  });

  if (!hasActiveSession) {
    throw new Error("session expired or logged out", { cause: 401 });
  }

  req.user = user;
  req.token = token;
  req.auth = decoded;
  next();
};
