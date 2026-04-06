import {
  deleteByPattern,
  deleteValue,
  exists,
  setValue,
} from "../../DB/Redis/redis.service.js";
import { DecodeToken, getTokenRemainingSeconds } from "./token.service.js";

const buildSessionKey = ({ userId, sessionId }) => `session:${userId}:${sessionId}`;
const buildBlacklistKey = (sessionId) => `session:blacklist:${sessionId}`;

export const registerSession = async ({
  userId,
  sessionId,
  token,
  metadata = {},
} = {}) => {
  const ttl = getTokenRemainingSeconds(token);
  await setValue({
    key: buildSessionKey({ userId, sessionId }),
    value: {
      userId,
      sessionId,
      ...metadata,
    },
    ttl,
  });

  return ttl;
};

export const isSessionActive = async ({ userId, sessionId } = {}) => {
  if (!userId || !sessionId) {
    return 0;
  }

  return exists(buildSessionKey({ userId, sessionId }));
};

export const blacklistSession = async ({
  sessionId,
  ttl,
  reason = "revoked",
} = {}) => {
  if (!sessionId) {
    return 0;
  }

  return setValue({
    key: buildBlacklistKey(sessionId),
    value: { reason },
    ttl,
  });
};

export const isSessionBlacklisted = async (sessionId) => {
  if (!sessionId) {
    return 0;
  }

  return exists(buildBlacklistKey(sessionId));
};

export const revokeAccessToken = async ({
  token,
  decodedPayload,
  reason = "revoked",
} = {}) => {
  const decodedToken = decodedPayload || DecodeToken(token);

  if (!decodedToken?.sid) {
    return 0;
  }

  const ttl = token ? getTokenRemainingSeconds(token) : 1;

  await blacklistSession({
    sessionId: decodedToken.sid,
    ttl,
    reason,
  });

  if (decodedToken.id) {
    await deleteValue(
      buildSessionKey({ userId: decodedToken.id, sessionId: decodedToken.sid })
    );
  }

  return 1;
};

export const revokeAllUserSessions = async (userId) => {
  if (!userId) {
    return 0;
  }

  return deleteByPattern(`session:${userId}:*`);
};

export { buildSessionKey, buildBlacklistKey };
