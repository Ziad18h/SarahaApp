import mongoose, { Schema } from "mongoose";
import { type } from "node:os";
import { GenderEnum, ProviderEnum } from "../../common/enum/user.enum.js";

const UserShcema = new Schema(
 {
  firstName: {
    type:String,
    required:true,
    minLength:3,
    maxLength:5,
    trim:true
  },
  lastName: {
    type:String,
    required:true,
    minLength:3,
    maxLength:5,
    trim:true
  },
  email: {
    type:String,
    required:true,
    unique:true,
    trim:true
  },
    password: {
      type:String,
      required:true,
      trim:true,
      minLength:6
    },
     age: Number,
      phone: {
      type: String,
      trim: true,
      unique: true
   },
     gender: {
      type:String,
      enum: Object.values(GenderEnum),
      default: GenderEnum.male
     },
     profilePicture: String,
     confirmed:Boolean,
     provider: {
      type:String,
      enum: Object.values(ProviderEnum),
      default: ProviderEnum.system
     }
 },

 {
  timestamps:true,
  strictQuery:true,
  toJSON: {virtuals:true}
 }

)

UserShcema.virtual("userName")
.get(function() {
  return this.firstName + " " + this.lastName
})
.set(function (v) {
  const  [firstName,lastName] =v.split(" ")
  this.set({firstName,lastName})
})
const userModel = mongoose.models.user || mongoose.model("user",UserShcema)
export default userModel