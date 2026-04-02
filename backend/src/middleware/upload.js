const multer = require("multer");
const path = require("path");
const fs = require("fs");

// cb is a callback function provided by multer to indicate if the file should be accepted or rejected,
// and to specify the destination and filename for accepted files

const storage = multer.diskStorage({
  // set directory where uploaded files will be stored
  destination: (req, file, cb) => {
    const dir = path.join("uploads");

    // create folder if it does not exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  // set filename to be the current timestamp and the original file extension
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + ext;
    cb(null, name);
  },
});

// only allow certain file types for each type of upload (avatar, resume, document)
const imageFilter = (req, file, cb) => {
  const allowed = ["image/png", "image/jpeg"];

  if (!allowed.includes(file.mimetype)) {
    return cb(null, false);
  }

  cb(null, true);
};

const pdfFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(null, false);
  }

  cb(null, true);
};

// create multer upload handlers for each of the three types of upload
const uploadAvatar = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5mb
});

const uploadResume = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10mb
});

const uploadDocument = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10mb
});

module.exports = {
  uploadAvatar,
  uploadResume,
  uploadDocument,
};
