import jwt from "jsonwebtoken"


export const GenToken = ({payload,secret_key,options={}}={}) => {
 return jwt.sign(payload,secret_key,options)
}


export const VerfiyToken = ({token,secret_key,options={}}={})=> {
 return jwt.verify(token,secret_key,options)
}

