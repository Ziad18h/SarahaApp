export const create = async ({ model, data } = {}) => {
  return model.create(data);
};

export const findOne = async ({
  model,
  filter = {},
  populate = [],
  select = "",
} = {}) => {
  return model.findOne(filter).populate(populate).select(select).exec();
};

export const find = async ({
  model,
  filter = {},
  populate = [],
  select = "",
  sort = {},
  skip = 0,
  limit = 0,
} = {}) => {
  const query = model.find(filter).populate(populate).select(select).sort(sort);

  if (skip) {
    query.skip(skip);
  }

  if (limit) {
    query.limit(limit);
  }

  return query.exec();
};

export const updateOne = async ({
  model,
  filter = {},
  update = {},
  options = {},
} = {}) => {
  return model.updateOne(filter, update, { runValidators: true, ...options }).exec();
};

export const findOneAndUpdate = async ({
  model,
  filter = {},
  update = {},
  options = {},
} = {}) => {
  return model
    .findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
      ...options,
    })
    .exec();
};

export const findOneupdate = findOneAndUpdate;

export const deleteOne = async ({ model, filter = {} } = {}) => {
  return model.deleteOne(filter).exec();
};
