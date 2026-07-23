import type { RequestHandler } from "express";
import multer from "multer";
import {
  MAX_IMAGE_BYTES,
  isSupportedImageType,
} from "../lib/image";

class UnsupportedImageTypeError extends Error {}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
  },
  fileFilter(_request, file, callback) {
    if (!isSupportedImageType(file.mimetype)) {
      callback(new UnsupportedImageTypeError("지원하지 않는 이미지 형식입니다."));
      return;
    }
    callback(null, true);
  },
});

export const handleImageUpload: RequestHandler = (request, response, next) => {
  upload.single("image")(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        response.status(413).json({ error: "이미지는 최대 5MB까지 업로드할 수 있습니다." });
        return;
      }
      response.status(400).json({ error: "이미지는 한 개만 업로드할 수 있습니다." });
      return;
    }

    if (error instanceof UnsupportedImageTypeError) {
      response.status(415).json({ error: error.message });
      return;
    }

    next(error);
  });
};
