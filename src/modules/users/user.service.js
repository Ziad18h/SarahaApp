import userModel from "../../DB/models/user.model.js";
import { ProviderEnum } from "../../common/enum/user.enum.js";
import * as db_service from "../../DB/db_service.js";
import { successRespose } from "../../common/utilties/response.success.js";
import { encrypt } from "../../common/utilties/security/encrypt.security.js";
import { Compare, hash } from "../../common/utilties/security/hash.security.js";
import { GenToken } from "../../common/utilties/token.service.js";
import { OAuth2Client } from "google-auth-library";

const GOOGLE_CLIENT_ID =
  "357480240545-v1bqpd24um85adk5v1gflcf27kr0el0c.apps.googleusercontent.com";

export const signup = async (req, res, next) => {
  const { userName, email, password, age, gender, phone } = req.body;

  const full = (userName || "").trim();
  const [firstName, ...rest] = full.split(" ");
  const lastName = rest.join(" ").trim();

  if (!firstName || !lastName) {
    throw new Error("userName must include first and last name", { cause: 400 });
  }

  if (
    await db_service.findOne({
      model: userModel,
      filter: { email },
    })
  ) {
    throw new Error("email already exists", { cause: 409 });
  }

  const user = await db_service.create({
    model: userModel,
    data: {
      firstName,
      lastName,
      email,
      password: hash({ plaintext: password }),
      age,
      gender,
      phone: encrypt(phone),
      provider: ProviderEnum.system,
    },
  });

  successRespose({
    res,
    status: 201,
    message: "user has been created",
    data: user,
  });
};

export const signupWithGmail = async (req, res, next) => {
  const { idToken } = req.body;
  if (!idToken) throw new Error("idToken is required", { cause: 400 });

  const client = new OAuth2Client(GOOGLE_CLIENT_ID);

  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { email, email_verified, name, picture } = payload;

  const full = (name || "").trim();
  const [firstName, ...rest] = full.split(" ");
  const lastName = rest.join(" ").trim() || "User";

  let user = await db_service.findOne({
    model: userModel,
    filter: { email },
  });

  if (!user) {
    user = await db_service.create({
      model: userModel,
      data: {
        firstName,
        lastName,
        email,
        confirmed: email_verified,
        profilePicture: picture,
        provider: ProviderEnum.google,
      },
    });
  }

  if (user.provider === ProviderEnum.system) {
    throw new Error("Sign With Your Email", { cause: 400 });
  }

  const access_token = GenToken({
    payload: { id: user._id, email: user.email },
    secret_key: "ziad",
    options: { expiresIn: "1day" },
  });

  successRespose({
    res,
    status: 201,
    message: "user has been created",
    data: { access_token },
  });
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;

  const user = await db_service.findOne({
    model: userModel,
    filter: { email, provider: ProviderEnum.system },
  });

  if (!user) throw new Error("user not found", { cause: 404 });

  if (!Compare({ plaintext: password, ciphertext: user.password })) {
    throw new Error("Wrong Password", { cause: 401 });
  }

  const access_token = GenToken({
    payload: { id: user._id, email: user.email },
    secret_key: "ziad",
    options: { expiresIn: "1day" },
  });

  successRespose({
    res,
    message: "welcome back",
    data: { access_token },
  });
};

export const getProfile = async (req, res, next) => {
  const user = await userModel.findById(req.user._id).select('-password');
  
  successRespose({
    res,
    message: "welcome back",
    data: {
      ...user.toObject(),
      visitMessage: `${user.visitCount}`
    },
  });
};


// Service بتاع جلب عدد الزيارات
export const getMyVisits = async (req, res, next) => {
  const user = await userModel.findById(req.user._id);
  
  successRespose({
    res,
    message: "Vistings Statistics  ",
    data: {
      visitCount: user.visitCount,
      lastVisit: user.lastVisit,
      message: `You have visted ${user.visitCount} times `
    }
  });
};