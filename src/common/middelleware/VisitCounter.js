import userModel from "../../DB/models/user.model.js";

export  const visitCounter = async (req, res, next) => {
  console.log('🔄 Visit counter middleware');
  
  if (req.user && req.user._id) {
    try {
      await userModel.findByIdAndUpdate(
        req.user._id,
        {
          $inc: { visitCount: 1 },
          $set: { lastVisit: new Date() }
        }
      );
      
      console.log('✅ Visit count updated for user:', req.user._id);
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
  next();
};