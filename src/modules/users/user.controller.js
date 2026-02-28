import * as US from "./user.service.js"
import { Router } from "express";
import { authantication } from "../../common/middelleware/authantication.js";
import { authorization } from "../../common/middelleware/authorization.js";
import { RoleEnum } from "../../common/enum/user.enum.js";
import { fileUpload } from "../../common/middelleware/fileUploading.js";
import { Validate } from "./user.validation.js";
import * as UV from "../../common/middelleware/validation.js";
import { multer_extensionEnum } from "../../common/enum/multer.enum.js";
import  {visitCounter}  from "../../common/middelleware/VisitCounter.js";
const userRouter = Router()



userRouter.post("/signup",fileUpload("users",multer_extensionEnum.image).single('files'),Validate(UV.signupSchema),US.signup)
userRouter.post("/signup/gmail",US.signupWithGmail)
userRouter.post("/signin",Validate(UV.signinschema),US.signin)
userRouter.get("/profile",authantication,authorization([RoleEnum.user]),visitCounter,US.getProfile)
userRouter.get("/my-visits", authantication, US.getMyVisits)







export default userRouter