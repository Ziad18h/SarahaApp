import crypto from "node:crypto";
import mongoose, { Schema } from "mongoose";
import {
  GenderEnum,
  ProviderEnum,
  RoleEnum,
} from "../../common/enum/user.enum.js";

const generateShareLink = () => crypto.randomBytes(8).toString("hex");

const imageSchema = new Schema(
  {
    secure_url: String,
    public_id: String,
  },
  { _id: false }
);

const UserShcema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 2,
      maxLength: 30,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      minLength: 2,
      maxLength: 30,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required() {
        return this.provider !== ProviderEnum.google;
      },
      trim: true,
      minLength: 6,
    },
    age: Number,
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: Object.values(GenderEnum),
      default: GenderEnum.male,
    },
    Roles: {
      type: String,
      enum: Object.values(RoleEnum),
      default: RoleEnum.user,
    },
    profilePicture: {
      type: imageSchema,
      default: undefined,
    },
    coverPicture: {
      type: [imageSchema],
      default: [],
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: Object.values(ProviderEnum),
      default: ProviderEnum.system,
    },
    visitCount: {
      type: Number,
      default: 0,
    },
    lastVisit: {
      type: Date,
      default: Date.now,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: null,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    banExpiresAt: {
      type: Date,
      default: null,
    },
    bannedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    shareLink: {
      type: String,
      unique: true,
      default: generateShareLink,
    },
  },
  {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
  }
);

UserShcema.virtual("userName")
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  })
  .set(function (value) {
    const [firstName, ...rest] = value.split(" ");
    this.set({ firstName, lastName: rest.join(" ") });
  });

const userModel = mongoose.models.user || mongoose.model("user", UserShcema);
export default userModel;
