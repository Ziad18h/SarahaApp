

export const authorization = (Roles=[]) => {
  return async (req, res, next) => {

    if(!Roles.includes(req.user.Roles)) {
       throw new Error("Unauthorized");
    }
  
  next();
};
}