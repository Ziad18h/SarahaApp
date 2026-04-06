import fs from "node:fs";
import path from "node:path";
import multer from "multer";

export const multer_local = (customPath = "General", allowedTypes = []) => {
  const uploadDir = path.resolve("files", customPath);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (allowedTypes.length && !allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"), false);
    }

    cb(null, true);
  };

  return multer({ storage, fileFilter });
};

export const multer_host = (allowedTypes = []) => {
  const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    if (allowedTypes.length && !allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"), false);
    }

    cb(null, true);
  };

  return multer({ storage, fileFilter });
};
