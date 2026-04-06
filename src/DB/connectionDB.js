import mongoose from "mongoose";
import cs from "../config/config.service.js";

const checkConnectionDB = async () => {
  try {
    await mongoose.connect(cs.uri);
    console.log("DB Connected");
  } catch (error) {
    console.error("Database connection failed", error);
    throw error;
  }
};

export default checkConnectionDB;
