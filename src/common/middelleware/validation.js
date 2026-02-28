import joi from "joi"
import { GenderEnum } from "../enum/user.enum.js"



export const signupSchema = {
    body: joi.object( {
   userName: joi.string().required(),
   email: joi.string().email({tlds: {allow:true, deny: ["org"]}, minDomainSegments:2, maxDomainSegments:3}).required(),
   password: joi.string().min(10).required().messages({
    "string.min":"password cannot be less than 10 character"
   }),
   age: joi.number().required(),
   gender:joi.string().valid(...Object.values(GenderEnum)).required(),
   phone: joi.string().required()
    }).required()
}


export const signinschema = {
    body: joi.object({
        email: joi.string(),
        password: joi.string().required()
    }).required()
}