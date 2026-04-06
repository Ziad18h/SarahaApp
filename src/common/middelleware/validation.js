const applyValidatedValue = (req, key, value) => {
  if (key === "query") {
    req.validatedQuery = value;
    return;
  }

  const currentValue = req[key];

  if (
    currentValue &&
    typeof currentValue === "object" &&
    !Array.isArray(currentValue)
  ) {
    for (const existingKey of Object.keys(currentValue)) {
      delete currentValue[existingKey];
    }

    Object.assign(currentValue, value);
    return;
  }

  req[key] = value;
};

export const validate = (schema = {}) => {
  return (req, res, next) => {
    const errorsMessages = [];

    for (const key of Object.keys(schema)) {
      const { error, value } = schema[key].validate(req[key], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        error.details.forEach((detail) => {
          errorsMessages.push({
            key,
            path: detail.path.join("."),
            message: detail.message,
          });
        });
      } else if (value !== undefined) {
        applyValidatedValue(req, key, value);
      }
    }

    if (errorsMessages.length) {
      return res.status(400).json({
        message: "validation error",
        errors: errorsMessages,
      });
    }

    return next();
  };
};

export const Validate = validate;
