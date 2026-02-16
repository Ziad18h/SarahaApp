import userModel from "../../DB/models/user.model.js";
import { VerfiyToken } from "../utilties/token.service.js";
import * as db_service from "./../../DB/db_service.js"



// export const authantication = async (req,res,next)=> {
//     const {authorization} = req.headers

// if (!authorization) {
//     throw new Error("token does not exist");
// }


// const [prefix,token] = authorization.split(" ")
// if (prefix !== "bearer") {
//     throw new Error("inavlid prefix"); 
// }



// const decoded = VerfiyToken({token, secret_key: "ziad"})
 
//  if (!decoded || !decoded?.id) {
//     throw new Error("inavlid token");
//  }
//  const user = await db_service.findOne({
//         model:userModel,
//     filter: {_id:decoded.id},
//     select:"-password"
// });
//  if(!user){
//         throw new Error("user not found",{cause: 404});
//  }

//  req.user = user 
//  next()

// }




export const authantication = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) throw new Error("token does not exist");

  const token = auth.replace(/^bearer\s+/i, "").trim();

  const decoded = VerfiyToken({ token, secret_key: "ziad" });
  if (!decoded?.id) throw new Error("invalid token");

  const user = await db_service.findOne({
    model: userModel,
    filter: { _id: decoded.id },
    select: "-password",
  });

  if (!user) throw new Error("user not found");

  req.user = user;
  next();
};
