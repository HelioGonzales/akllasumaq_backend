import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import sharp from "sharp";
import { Category } from "../models/category.js";
import { s3Commands } from "../helper/s3Helper.js";
import * as fs from "fs";

export const routerCategory = express.Router();

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const isValid = FILE_TYPE_MAP[file.mimetype];
//     let uploadError = new Error("Invalid image type");

//     if (isValid) {
//       uploadError = null;
//     }

//     cb(uploadError, "public/uploads");
//   },
//   filename: function (req, file, cb) {
//     const fileName = file.originalname.split(" ").join("-");
//     const extension = FILE_TYPE_MAP[file.mimetype];
//     cb(null, `${fileName}-${Date.now()}.${extension}`);
//   },
// });

// Other option
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads";

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const originalName = file.originalname;
    const extension = originalName.split(".").pop();
    cb(null, Date.now() + "." + extension);
  },
});

const uploadOptions = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  },
});

/* Route */
routerCategory.get(`/`, async (req, res) => {
  const categoryList = await Category.find();

  if (!categoryList) {
    res.status(500).json({
      success: false,
    });
  }
  res.status(200).send(categoryList);
});

routerCategory.get("/:id", async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res
      .status(500)
      .json({ message: "Category with the given ID was not found" });
  }

  res.status(200).send(category);
});

routerCategory.post(`/`, uploadOptions.single("image"), async (req, res) => {
  // const file = req.file;
  // if (!file) {
  //   return res.status(400).send("No image in the request");
  // }
  // const fileName = req.file.filename;
  // const basePath = `https://${req.get("host")}/public/uploads/`;
  // // const filePath = file.filePath;
  // // filePath is an argument in sharp
  // // file.buffer is an argument in sharp
  // // await sharp(basePath)
  // //   .rotate()
  // //   .toBuffer()
  // //   .then((buffer) => {
  // //     //save to s3
  // //     return s3Commands.addObject(fileName, buffer);
  // //   })
  // //   .catch((err) => console.log(err));
  // // Process the image directly from the buffer
  // const buffer = await sharp(file.buffer).rotate().toBuffer();
  // // Save to S3
  // await s3Commands.addObject(fileName, buffer);
  // let category = await new Category({
  //   name: req.body.name,
  //   icon: req.body.icon,
  //   color: req.body.color,
  //   image: `${basePath}${fileName}`,
  //   // image: (file && fileName) || "",
  // });
  // category = await category.save();
  // if (!category) {
  //   return res.status(404).send("the category cannot be created");
  // }
  // res.send(category);

  const file = req.file;
  if (!file) {
    return res.status(400).send("No image in the request");
  }

  const fileName = req.file.filename;
  const basePath = `https://${req.get("host")}/public/uploads/`;

  try {
    // Save directly to S3 without using Sharp
    await s3Commands.addObject(fileName, file.buffer);

    let category = await new Category({
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
      // image: `${basePath}${fileName}`,
      image: (file && fileName) || "",
    });

    category = await category.save();

    if (!category) {
      return res.status(404).send("The category cannot be created");
    }

    res.send(category);
  } catch (error) {
    console.error("S3 Upload Error:", error);
    return res.status(500).send("Internal server error");
  }
});

routerCategory.put("/:id", uploadOptions.single("image"), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).send("Invalid Id");
  }

  const category = await Category.findById(req.params.id);
  if (!category) return res.status(400).send("Invalid Category");

  const file = req.file;
  let imagesPath;

  if (file) {
    const fileName = req.file.filename;
    const basePath = `https://${req.get("host")}/public/uploads/`;
    imagesPath = `${basePath}${fileName}`;
  } else {
    imagesPath = category.image;
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
      image: imagesPath,
    },
    {
      new: true,
    }
  );

  if (!updatedCategory) {
    return res.status(404).send("the category cannot be updated");
  }

  res.send(category);
});

routerCategory.delete("/:id", (req, res) => {
  Category.findByIdAndRemove(req.params.id)
    .then((category) => {
      if (category) {
        return res.status(200).json({
          success: true,
          message: "Category is deleted",
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});
