import { Router } from "express";
import { authantication } from "../../common/middelleware/authantication.js";
import { validate } from "../../common/middelleware/validation.js";
import * as messageService from "./message.service.js";
import * as messageValidation from "./message.validation.js";

const messageRouter = Router();

messageRouter.post(
  "/:shareLink",
  validate(messageValidation.sendMessageSchema),
  messageService.sendMessage
);

messageRouter.use(authantication);

messageRouter.get("/", messageService.getMyMessages);

messageRouter.patch(
  "/:messageId/read",
  validate(messageValidation.messageIdParamsSchema),
  messageService.markMessageAsRead
);

messageRouter.delete(
  "/:messageId",
  validate(messageValidation.messageIdParamsSchema),
  messageService.deleteMessage
);

export default messageRouter;
