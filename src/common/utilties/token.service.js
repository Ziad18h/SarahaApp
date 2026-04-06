import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import cs from "../../config/config.service.js";

export const GenToken = ({
  payload,
  secret_key = cs.accessTokenSecret,
  options = {},
} = {}) => {
  return jwt.sign(payload, secret_key, options);
};

export const VerfiyToken = ({
  token,
  secret_key = cs.accessTokenSecret,
  options = {},
} = {}) => {
  return jwt.verify(token, secret_key, options);
};

export const DecodeToken = (token) => jwt.decode(token);

export const generateSessionId = () => crypto.randomUUID();

export const generateAccessToken = ({ user, extraPayload = {} } = {}) => {
  const sessionId = generateSessionId();
  const token = GenToken({
    payload: {
      id: user._id.toString(),
      email: user.email,
      role: user.Roles,
      tokenVersion: user.tokenVersion ?? 0,
      sid: sessionId,
      type: "access",
      ...extraPayload,
    },
    options: { expiresIn: cs.accessTokenExpiresIn },
  });

  return { token, sessionId };
};

export const generateChallengeToken = ({
  user,
  purpose,
  sessionId = generateSessionId(),
} = {}) => {
  return GenToken({
    payload: {
      id: user._id.toString(),
      email: user.email,
      sid: sessionId,
      purpose,
      tokenVersion: user.tokenVersion ?? 0,
      type: "challenge",
    },
    options: { expiresIn: "10m" },
  });
};

export const getTokenRemainingSeconds = (token) => {
  const decodedToken = DecodeToken(token);
  if (!decodedToken?.exp) {
    return 1;
  }

  return Math.max(decodedToken.exp - Math.floor(Date.now() / 1000), 1);
};
