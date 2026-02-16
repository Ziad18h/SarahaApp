import {hashSync,compareSync} from "bcrypt"


export const hash = ({plaintext,salt_rounds=12}={})=> {
  return hashSync(plaintext,salt_rounds)
}

export const Compare = ({plaintext,ciphertext}={})=> {
  return compareSync(plaintext,ciphertext)
}