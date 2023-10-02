import express from "express";
import { Order } from "../models/order.js";
import { OrderItem } from "../models/order-item.js";

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

routerOrder.post(`/`, async (req, res) => {
  const orderItemsIds = Promise.all(
    req.body.orderItems.map(async (orderItem) => {
      let newOrderItem = new OrderItem({
        quantity: orderItem.quantity,
        product: orderItem.product,
      });

      newOrderItem = await newOrderItem.save();

      return newOrderItem._id;
    })
  );

  const orderItemsIdResolved = await orderItemsIds;

  let order = new Order({
    orderItems: orderItemsIdResolved,
    shippingAddress1: req.body.shippingAddress1,
    shippingAddress2: req.body.shippingAddress2,
    city: req.body.city,
    zip: req.body.zip,
    country: req.body.country,
    phone: req.body.phone,
    status: req.body.status,
    totalPrice: req.body.totalPrice,
    user: req.body.user,
  });

  order = await order.save();

  if (!order) {
    return res.status(400).send("The order cannot be created");
  }
  res.send(order);
});
