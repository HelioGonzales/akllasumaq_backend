import express from "express";
import { Product } from "../models/product.js";

export const routerProduct = express.Router();

/* Route */
routerProduct.get(`/`, async (req, res) => {
  const productList = await Product.find();

  if (!productList) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(productList);
});

routerProduct.post(`/`, (req, res) => {
  const product = new Product({
    name: req.body.name,
    image: req.body.image,
    countInStock: req.body.countInStock,
  });

  product
    .save()
    .then((createdProduct) => {
      res.status(201).json(createdProduct);
    })
    .catch((err) => {
      res.status(501).json({
        error: err,
        success: false,
      });
    });
});
