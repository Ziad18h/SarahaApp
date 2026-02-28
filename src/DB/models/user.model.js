import mongoose, { Schema } from "mongoose";
import { GenderEnum, ProviderEnum, RoleEnum } from "../../common/enum/user.enum.js";

const UserShcema = new Schema(
 {
  firstName: {
    type:String,
    required:true,
    minLength:3,
    maxLength:30,
    trim:true
  },
  lastName: {
    type:String,
    required:true,
    minLength:3,
    maxLength:30,
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
      required: function () 
      {
       return this.provider == ProviderEnum.google ? false : true  
      },
      trim:true,
      minLength:6,
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
     Roles: {
      type:String,
      enum: Object.values(RoleEnum),
      default: RoleEnum.user
     },
     profilePicture: String,
     confirmed:Boolean,
     provider: {
      type:String,
      enum: Object.values(ProviderEnum),
      default: ProviderEnum.system
     },

     visitCount: {
      type:Number,
      default:0
     },
     lastVisit: {
      type:Date,
      default:Date.now
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