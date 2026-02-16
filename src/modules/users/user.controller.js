import * as US from "./user.service.js"
import { Router } from "express";
import { authantication } from "../../common/middelleware/authantication.js";


const userRouter = Router()



userRouter.post("/signup",US.signup)
userRouter.post("/signin",US.signin)
userRouter.get("/profile",authantication,US.getProfile)








export default userRouter