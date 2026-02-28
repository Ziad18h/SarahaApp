export const Validate = (schema) => {
  return (req, res, next) => {
    const errorsMessages = [];

    for (const key of Object.keys(schema)) {
      const { error } = schema[key].validate(req[key], { abortEarly: false });

      if (error) {
        error.details.forEach((detail) => {
          errorsMessages.push({
            key, // body / params / query
            path: detail.path.join("."), // e.g. "email"
            message: detail.message
          });
        });
      }
    }

    if (errorsMessages.length) {
      return res.status(400).json({
        message: "validation error",
        errors: errorsMessages
      });
    }

    return next();
  };
};