import messageModel from "../../DB/models/message.model.js";
import userModel from "../../DB/models/user.model.js";
import { successRespose } from "../../common/utilties/response.success.js";

const sanitizeMessage = (message) => ({
  id: message._id,
  content: message.content,
  isRead: message.isRead,
  readAt: message.readAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const normalizeMessagesQuery = (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 50);
  let isRead;

  if (query.isRead === true || query.isRead === "true") {
    isRead = true;
  } else if (query.isRead === false || query.isRead === "false") {
    isRead = false;
  }

  return {
    page,
    limit,
    isRead,
  };
};

export const sendMessage = async (req, res, next) => {
  const recipient = await userModel.findOne({
    shareLink: req.params.shareLink,
    confirmed: true,
    isBanned: false,
  });

  if (!recipient) {
    throw new Error("recipient not found", { cause: 404 });
  }

  const message = await messageModel.create({
    recipient: recipient._id,
    content: req.body.content,
  });

  successRespose({
    res,
    status: 201,
    message: "message sent successfully",
    data: {
      messageId: message._id,
      recipient: {
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        shareLink: recipient.shareLink,
      },
      createdAt: message.createdAt,
    },
  });
};

export const getMyMessages = async (req, res, next) => {
  const query = normalizeMessagesQuery(req.query);
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const filter = {
    recipient: req.user._id,
    deletedAt: null,
  };

  if (typeof query.isRead === "boolean") {
    filter.isRead = query.isRead;
  }

  const [messages, totalCount, unreadCount] = await Promise.all([
    messageModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    messageModel.countDocuments(filter),
    messageModel.countDocuments({
      recipient: req.user._id,
      deletedAt: null,
      isRead: false,
    }),
  ]);

  successRespose({
    res,
    message: "messages fetched successfully",
    data: {
      items: messages.map(sanitizeMessage),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(Math.ceil(totalCount / limit), 1),
      },
      unreadCount,
    },
  });
};

export const markMessageAsRead = async (req, res, next) => {
  const message = await messageModel.findOne({
    _id: req.params.messageId,
    recipient: req.user._id,
    deletedAt: null,
  });

  if (!message) {
    throw new Error("message not found", { cause: 404 });
  }

  if (!message.isRead) {
    message.isRead = true;
    message.readAt = new Date();
    await message.save();
  }

  successRespose({
    res,
    message: "message marked as read successfully",
    data: sanitizeMessage(message),
  });
};

export const deleteMessage = async (req, res, next) => {
  const message = await messageModel.findOne({
    _id: req.params.messageId,
    recipient: req.user._id,
    deletedAt: null,
  });

  if (!message) {
    throw new Error("message not found", { cause: 404 });
  }

  message.deletedAt = new Date();
  await message.save();

  successRespose({
    res,
    message: "message deleted successfully",
    data: {
      id: message._id,
      deletedAt: message.deletedAt,
    },
  });
};
