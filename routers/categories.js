import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import sharp from "sharp";
import { Category } from "../models/category.js";
import { s3Commands } from "../helper/s3Helper.js";
import * as fs from "fs";

import dotenv from "dotenv";

dotenv.config();

export const routerCategory = express.Router();

const s3BaseUrl = `https://akllasumaq.s3.eu-north-1.amazonaws.com/`;

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
  const file = req.file;
  if (!file) {
    return res.status(400).send("No image in the request");
  }

  const fileName = req.file.filename;
  const basePath = `${s3BaseUrl}${file.path}`;

  try {
    // Use Sharp to process the image (e.g., rotate) before saving to S3
    const processedImageBuffer = await sharp(file.path).rotate().toBuffer();

    // Save processed image to S3
    await s3Commands.addObject(fileName, processedImageBuffer);

    let category = await new Category({
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
      image: basePath.includes("public\\uploads\\")
        ? basePath.replace("public\\uploads\\", "")
        : basePath.includes("public/uploads/")
        ? basePath.replace("public/uploads/", "")
        : basePath,
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
    return;
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(400).send("Invalid Category");
    return;
  }

  let imagesPath = category.image;
  let processedImageBuffer; // Define processedImageBuffer in a broader scope

  try {
    const file = req.file;

    if (file) {
      const fileName = req.file.filename;
      const basePath = `${s3BaseUrl}${file.path}`;

      // Use Sharp to process the image (e.g., rotate) before saving to S3
      processedImageBuffer = await sharp(file.path).rotate().toBuffer();

      // Save processed image to S3
      await s3Commands.addObject(fileName, processedImageBuffer);

      imagesPath = basePath.includes("public\\uploads\\")
        ? basePath.replace("public\\uploads\\", "")
        : basePath.includes("public/uploads/")
        ? basePath.replace("public/uploads/", "")
        : basePath;
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
      return res.status(404).send("The category cannot be updated");
    }

    // Delete the old image from AWS S3
    if (file && category.image) {
      const oldImageKey = category.image.split("/").pop(); // Extract filename from the old image path
      await s3Commands.deleteObject(oldImageKey);
    }

    // Delete the local image file
    if (category.image) {
      const localImagePath = `public/uploads/${category.image
        .split("/")
        .pop()}`;
      if (fs.existsSync(localImagePath)) {
        fs.unlinkSync(localImagePath);
      }
    }

    // Save the new image to local file system
    if (file) {
      const newLocalImagePath = `public/uploads/${file.filename}`;
      fs.writeFileSync(newLocalImagePath, processedImageBuffer);
    }

    res.send(updatedCategory);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal server error");
  }
});

routerCategory.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndRemove(req.params.id);

    if (category) {
      // Delete the image from AWS S3
      if (category.image) {
        const imageKey = category.image.split("/").pop(); // Extract filename from the image path
        await s3Commands.deleteObject(imageKey);
      }

      // Delete the local image file
      if (category.image) {
        const localImagePath = `public/uploads/${category.image
          .split("/")
          .pop()}`;
        if (fs.existsSync(localImagePath)) {
          fs.unlinkSync(localImagePath);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Category and associated image are deleted",
      });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
  } catch (err) {
    console.error("Error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});
