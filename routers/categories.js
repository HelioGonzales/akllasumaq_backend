import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { Category } from "../models/category.js";

export const routerCategory = express.Router();

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error("Invalid image type");

    if (isValid) {
      uploadError = null;
    }

    cb(uploadError, "public/uploads");
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(" ").join("-");
    const extension = FILE_TYPE_MAP[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});

const uploadOptions = multer({ storage: storage });

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
  const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;

  let category = await new Category({
    name: req.body.name,
    icon: req.body.icon,
    color: req.body.color,
    image: `${basePath}${fileName}`,
  });

  category = await category.save();

  if (!category) {
    return res.status(404).send("the category cannot be created");
  }

  res.send(category);
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
    const fileName = req.filename;
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
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
