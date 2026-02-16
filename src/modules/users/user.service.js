import userModel from "../../DB/models/user.model.js"
import { ProviderEnum } from "../../common/enum/user.enum.js"
import * as db_service from "../../DB/db_service.js"
import { successRespose } from "../../common/utilties/response.success.js"
import { decrypt, encrypt } from "../../common/utilties/security/encrypt.security.js"
import {hashSync,compareSync} from "bcrypt"
import { Compare, hash } from "../../common/utilties/security/hash.security.js"
import jwt from "jsonwebtoken"
import {GenToken,VerfiyToken} from "../../common/utilties/token.service.js"

export const signup = async(req,res,next)=> {
 const {userName,email,password,age,gender,phone} = req.body

 if(await db_service.findOne({
    model:userModel,
    filter:{email}
})){
    throw new Error("email already exists",{cause: 409});
 }
 const user = await db_service.create({model:userModel, data: {
    userName,
    email,
    password:hash({plaintext:password}),
    age,
    gender,
    phone:encrypt(phone)
}})

 successRespose({
    res,
    status: 201,
     message:"user has been craeted",
      data:user
})
}



export const signin = async(req,res,next)=> {
 const {email,password} = req.body

 const user = await db_service.findOne({
        model:userModel,
    filter: {email,provider:ProviderEnum.system}
});
 if(!user){
        throw new Error("user not found",{cause: 404});
 }

    if(!Compare({plaintext:password , ciphertext: user.password})) {

        throw new Error("Wrong Password",{cause:401});
            }

            const access_token= GenToken({
                payload: {id:user._id,email:user.email},

                secret_key:"ziad",
                options:{
                    expiresIn:5
                }
            })

             successRespose({
    res,
     message:"welcome back",
      data:{access_token}
})
}
export const getProfile = async(req,res,next)=> {
 
             successRespose({
    res,
     message:"welcome back",
      data:req.user
})
}