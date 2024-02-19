import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { Product } from "../models/product.js";
import { Category } from "../models/category.js";
import sharp from "sharp";
import { s3Commands } from "../helper/s3Helper.js";
import * as fs from "fs";
import dotenv from "dotenv";

dotenv.config();

export const routerProduct = express.Router();

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
routerProduct.get(`/`, async (req, res) => {
  let filter = {};
  if (req.query.categories) {
    filter = { category: req.query.categories.split(",") };
  }

  const productList = await Product.find(filter).populate("category");

  if (!productList) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(productList);
});

routerProduct.get(`/:id`, async (req, res) => {
  const product = await Product.findById(req.params.id).populate("category");

  if (!product) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(product);
});

routerProduct.put("/:id", uploadOptions.single("image"), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).send("Invalid Id");
  }

  const category = await Category.findById(req.body.category);
  if (!category) {
    return res.status(400).send("Invalid Category");
  }

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(400).send("Invalid Product");

  let imagesPath = product.image;
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

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
        image: imagesPath,
      },
      {
        new: true,
      }
    );

    if (!updatedProduct) {
      return res.status(404).send("The product cannot be updated");
    }

    // Delete the old image from AWS S3
    if (file && product.image) {
      const oldImageKey = product.image.split("/").pop(); // Extract filename from the old image path
      await s3Commands.deleteObject(oldImageKey);
    }

    // Delete the local image file
    if (product.image) {
      const localImagePath = `public/uploads/${product.image.split("/").pop()}`;
      if (fs.existsSync(localImagePath)) {
        fs.unlinkSync(localImagePath);
      }
    }

    // Save the new image to local file system
    if (file) {
      const newLocalImagePath = `public/uploads/${file.filename}`;
      fs.writeFileSync(newLocalImagePath, processedImageBuffer);
    }

    res.send(updatedProduct);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal server error");
  }
});

routerProduct.post(`/`, uploadOptions.single("image"), async (req, res) => {
  const category = await Category.findById(req.body.category);
  if (!category) {
    return res.status(400).send("Invalid Category");
  }

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

    let product = await new Product({
      name: req.body.name,
      description: req.body.description,
      richDescription: req.body.richDescription,
      brand: req.body.brand,
      price: req.body.price,
      category: req.body.category,
      countInStock: req.body.countInStock,
      rating: req.body.rating,
      numReviews: req.body.numReviews,
      isFeatured: req.body.isFeatured,
      image: basePath.includes("public\\uploads\\")
        ? basePath.replace("public\\uploads\\", "")
        : basePath.includes("public/uploads/")
        ? basePath.replace("public/uploads/", "")
        : basePath,
    });

    product = await product.save();

    if (!product) {
      return res.status(500).send("The product cannot be created");
    }

    res.send(product);
  } catch (error) {
    console.error("S3 Upload Error:", error);
    return res.status(500).send("Internal server error");
  }
});

routerProduct.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndRemove(req.params.id);

    if (product) {
      // Delete the image from AWS S3
      if (product.image) {
        const imageKey = product.image.split("/").pop(); // Extract filename from the image path
        await s3Commands.deleteObject(imageKey);
      }

      // Delete the local image file
      if (product.image) {
        const localImagePath = `public/uploads/${product.image
          .split("/")
          .pop()}`;
        if (fs.existsSync(localImagePath)) {
          fs.unlinkSync(localImagePath);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Product and associated image are deleted",
      });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
  } catch (err) {
    console.error("Error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

routerProduct.get("/get/count", async (req, res) => {
  const productCount = await Product.countDocuments();

  if (!productCount) {
    res.status(500).json({ success: false });
  }

  res.send({
    productCount: productCount,
  });
});

routerProduct.get("/get/featured/:count", async (req, res) => {
  const count = req.params.count ? req.params.count : 0;
  const products = await Product.find({ isFeatured: true }).limit(+count);

  if (!products) {
    res.status(500).json({ success: false });
  }

  res.send(products);
});

routerProduct.put(
  "/gallery-images/:id",
  uploadOptions.array("images", 10),
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).send("Invalid Id");
    }

    const files = req.files;
    let imagesPaths = [];
    const basePath = `https://${req.get("host")}/public/uploads/`;

    if (files) {
      files.map((file) => {
        imagesPaths.push(`${basePath}${file.filename}`);
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        images: imagesPaths,
      },
      {
        new: true,
      }
    );
    if (!product) {
      return res.status(500).send("the product cannot be updated");
    }
    res.send(product);
  }
);
