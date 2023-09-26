import express from "express";
import { Order } from "../models/order.js";

export const routerOrder = express.Router();

/* Route */
routerOrder.get(`/`, async (req, res) => {
  const orderList = await Order.find();

  if (!orderList) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(orderList);
});

routerOrder.post(`/`, (req, res) => {
  const order = new Order({
    name: req.body.name,
    image: req.body.image,
    countInStock: req.body.countInStock,
  });

  order
    .save()
    .then((createdOrder) => {
      res.status(201).json(createdOrder);
    })
    .catch((err) => {
      res.status(501).json({
        error: err,
        success: false,
      });
    });
});
