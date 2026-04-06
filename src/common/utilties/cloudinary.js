import { v2 as cloudinary } from "cloudinary";
import cs from "../../config/config.service.js";

cloudinary.config({
  cloud_name: cs.cloudinaryCloudName,
  api_key: cs.cloudinaryApiKey,
  api_secret: cs.cloudinaryApiSecret,
});

export default cloudinary;
