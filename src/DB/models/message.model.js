import mongoose, { Schema } from "mongoose";

const MessageSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minLength: 1,
      maxLength: 2000,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strictQuery: true,
  }
);

MessageSchema.index({ recipient: 1, createdAt: -1 });

const messageModel =
  mongoose.models.message || mongoose.model("message", MessageSchema);

export default messageModel;
