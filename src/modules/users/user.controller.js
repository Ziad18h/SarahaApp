import { Router } from "express";
import * as userService from "./user.service.js";
import { authantication } from "../../common/middelleware/authantication.js";
import { authorization } from "../../common/middelleware/authorization.js";
import { validate } from "../../common/middelleware/validation.js";
import { RoleEnum } from "../../common/enum/user.enum.js";
import { multer_local } from "../../common/middelleware/fileUploading.js";
import { multer_extensionEnum } from "../../common/enum/multer.enum.js";
import { visitCounter } from "../../common/middelleware/VisitCounter.js";
import * as userValidation from "./user.validation.js";

const userRouter = Router();

userRouter.post(
  "/signup",
  multer_local("users", multer_extensionEnum.image).single("attachment"),
  validate(userValidation.signupSchema),
  userService.signup
);

userRouter.post(
  "/signup/gmail",
  validate(userValidation.googleSignupSchema),
  userService.signupWithGmail
);

userRouter.post(
  "/otp/send",
  validate(userValidation.sendPublicOtpSchema),
  userService.sendPublicOtp
);

userRouter.post(
  "/otp/verify",
  validate(userValidation.verifyPublicOtpSchema),
  userService.verifyPublicOtp
);

userRouter.post(
  "/confirm-email",
  validate(userValidation.confirmEmailSchema),
  userService.confirmEmail
);

userRouter.post(
  "/resend-confirmation",
  validate(userValidation.resendConfirmationSchema),
  userService.resendConfirmationOtp
);

userRouter.post(
  "/signin",
  validate(userValidation.signinSchema),
  userService.signin
);

userRouter.post(
  "/signin/verify-2fa",
  validate(userValidation.verifyTwoFactorSchema),
  userService.verifyTwoFactorSignin
);

userRouter.post(
  "/signin/2sv",
  validate(userValidation.verifyTwoFactorSchema),
  userService.verifyTwoFactorSignin
);

userRouter.post(
  "/forgot-password",
  validate(userValidation.forgotPasswordSchema),
  userService.forgotPassword
);

userRouter.post(
  "/reset-password",
  validate(userValidation.resetPasswordSchema),
  userService.resetPassword
);

userRouter.get(
  "/public/:shareLink",
  validate(userValidation.shareLinkParamsSchema),
  userService.getPublicProfile
);

userRouter.use(authantication);

userRouter.get(
  "/profile",
  authorization([RoleEnum.user, RoleEnum.admin]),
  visitCounter,
  userService.getProfile
);

userRouter.get("/my-visits", userService.getMyVisits);
userRouter.get("/share-link", userService.getShareLink);

userRouter.post(
  "/2fa/send-otp",
  validate(userValidation.sendTwoFactorOtpSchema),
  userService.sendTwoFactorOtp
);

userRouter.patch(
  "/2fa/enable",
  validate(userValidation.toggleTwoFactorSchema),
  userService.enableTwoFactor
);

userRouter.patch(
  "/2fa/disable",
  validate(userValidation.toggleTwoFactorSchema),
  userService.disableTwoFactor
);

userRouter.post("/logout", userService.logout);
userRouter.post("/logout-all", userService.logoutAllDevices);

userRouter.post(
  "/revoke-token",
  validate(userValidation.revokeTokenSchema),
  userService.revokeToken
);

userRouter.patch(
  "/:userId/ban",
  authorization([RoleEnum.admin]),
  validate(userValidation.userIdParamsSchema),
  validate(userValidation.banUserSchema),
  userService.banUser
);

userRouter.patch(
  "/:userId/unban",
  authorization([RoleEnum.admin]),
  validate(userValidation.userIdParamsSchema),
  userService.unbanUser
);

export default userRouter;
