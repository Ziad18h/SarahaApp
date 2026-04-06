import userModel from "../../DB/models/user.model.js";

export const visitCounter = async (req, res, next) => {
  if (req.user && req.user._id) {
    try {
      await userModel.findByIdAndUpdate(req.user._id, {
        $inc: { visitCount: 1 },
        $set: { lastVisit: new Date() },
      });
    } catch (error) {
      console.error("Visit counter update failed", error.message);
    }
  }

  next();
};
