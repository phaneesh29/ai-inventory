import multer from "multer";
import { BadRequestError } from "../utils/errors.js";

const storage = multer.memoryStorage();

const allowedExtensions = new Set([
  "xlsx",
  "xls",
  "csv",
  "txt",
  "json",
  "pdf",
  "docx",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (allowedExtensions.has(ext)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Unsupported file format '.${ext}'. Allowed: xlsx, xls, csv, txt, json, pdf, docx, png, jpg, webp`));
    }
  },
});
