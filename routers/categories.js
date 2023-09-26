import express from "express";
import { Category } from "../models/category.js";

export const routerCategory = express.Router();

/* Route */
routerCategory.get(`/`, async (req, res) => {
  const categoryList = await Category.find();

  if (!categoryList) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(categoryList);
});

routerCategory.post(`/`, (req, res) => {
  const category = new Category({
    name: req.body.name,
    image: req.body.image,
    countInStock: req.body.countInStock,
  });

  category
    .save()
    .then((createdCategory) => {
      res.status(201).json(createdCategory);
    })
    .catch((err) => {
      res.status(501).json({
        error: err,
        success: false,
      });
    });
});
