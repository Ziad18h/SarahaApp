import joi from "joi";

const objectIdSchema = joi.string().trim().hex().length(24).required();

export const sendMessageSchema = {
  params: joi
    .object({
      shareLink: joi.string().trim().required(),
    })
    .required(),
  body: joi
    .object({
      content: joi.string().trim().min(1).max(2000).required(),
    })
    .required(),
};

export const messageIdParamsSchema = {
  params: joi
    .object({
      messageId: objectIdSchema,
    })
    .required(),
};
