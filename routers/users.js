import express from "express";
import { User } from "../models/user.js";

export const routerUser = express.Router();

/* Route */
routerUser.get(`/`, async (req, res) => {
  const userList = await User.find();

  if (!userList) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(userList);
});

routerUser.post(`/`, (req, res) => {
  const user = new User({
    name: req.body.name,
    image: req.body.image,
    countInStock: req.body.countInStock,
  });

  user
    .save()
    .then((createdUser) => {
      res.status(201).json(createdUser);
    })
    .catch((err) => {
      res.status(501).json({
        error: err,
        success: false,
      });
    });
});
