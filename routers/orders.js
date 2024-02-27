import express from "express";
import { Order } from "../models/order.js";
import { OrderItem } from "../models/order-item.js";
import { Product } from "../models/product.js";
import stripe from "stripe";

const stripeInstance = stripe(
  "sk_test_51OmLekBbaf2Jg1z4PkMNXpAGH9eIKFTpGvdhIi8XaG4lKEQLC4BXQBL56t4b7cKinNox4S5djISbbOcgwSAtkwhY00CFcxRDqS"
);

export const routerOrder = express.Router();

/* Route */
routerOrder.get(`/`, async (req, res) => {
  const orderList = await Order.find()
    .populate("user", "name")
    .sort({ dateOrdered: -1 });

  if (!orderList) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(orderList);
});

routerOrder.get(`/:id`, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name")
    .populate({
      path: "orderItems",
      populate: { path: "product", populate: "category" },
    });
  if (!order) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(order);
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

  const totalPrices = await Promise.all(
    orderItemsIdResolved.map(async (orderItemId) => {
      const orderItem = await OrderItem.findById(orderItemId).populate(
        "product",
        "price"
      );
      const totalPrice = orderItem.product.price * orderItem.quantity;

      return totalPrice;
    })
  );

  const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

  let order = new Order({
    orderItems: orderItemsIdResolved,
    shippingAddress1: req.body.shippingAddress1,
    shippingAddress2: req.body.shippingAddress2,
    city: req.body.city,
    zip: req.body.zip,
    country: req.body.country,
    phone: req.body.phone,
    status: req.body.status,
    totalPrice: totalPrice,
    user: req.body.user,
  });

  order = await order.save();

  if (!order) {
    return res.status(400).send("The order cannot be created");
  }
  res.send(order);
});

routerOrder.post("/create-checkout-session", async (req, res) => {
  const orderItems = req.body;

  if (!orderItems) {
    return res.status(400).send("checkout session cannot be created");
  }

  const lineItems = await Promise.all(
    orderItems.map(async (orderItem) => {
      const product = await Product.findById(orderItem.product);
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
          },
          unit_amount: product.price * 100,
        },
        quantity: orderItem.quantity,
      };
    })
  );

  const session = await stripeInstance.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    // success_url:
    //   "http://localhost:4200/cart-page/thank-you?orderId={CHECKOUT_SESSION_ID}",
    // cancel_url: "http://localhost:4200/cart-page/error",
    success_url:
      "https://heliogonzales.github.io/akllasumaq/#/cart-page/thank-you?orderId={CHECKOUT_SESSION_ID}",
    cancel_url: "https://heliogonzales.github.io/akllasumaq/#/cart-page/error",
  });

  res.json({ id: session.id });
});

routerOrder.put("/:id", async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status,
    },
    {
      new: true,
    }
  );

  if (!order) {
    return res.status(404).send("the order cannot be updated");
  }

  res.send(order);
});

routerOrder.delete("/:id", (req, res) => {
  Order.findByIdAndRemove(req.params.id)
    .then(async (order) => {
      if (order) {
        await order.orderItems.map(async (orderItem) => {
          await OrderItem.findByIdAndRemove(orderItem);
        });

        return res.status(200).json({
          success: true,
          message: "Order is deleted",
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

routerOrder.get("/get/totalsales", async (req, res) => {
  const totalSales = await Order.aggregate([
    {
      $group: { _id: null, totalsales: { $sum: "totalPrice" } },
    },
  ]);

  if (!totalSales) {
    return res.status(400).send("The order sales cannot be generated");
  }

  // res.send({ totalsales: totalSales.pop().totalsales });
  res.send({ totalsales: totalSales });
});

routerOrder.get("/get/count", async (req, res) => {
  const orderCount = await Order.countDocuments();

  if (!orderCount) {
    res.status(500).json({ success: false });
  }

  res.send({
    orderCount: orderCount,
  });
});

routerOrder.get(`/get/userorders/:userid`, async (req, res) => {
  const userOrderList = await Order.find({ user: req.params.userid });
  populate({
    path: "orderItems",
    populate: { path: "product", populate: "category" },
  }).sort({ dateOrdered: -1 });

  if (!userOrderList) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(userOrderList);
});
