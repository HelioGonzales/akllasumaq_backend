import express from "express";
import bcrypt from "bcryptjs";
import Jwt from "jsonwebtoken";
import { User } from "../models/user.js";

export const routerUser = express.Router();

/* Route */
routerUser.get(`/`, async (req, res) => {
  const userList = await User.find().select("-passwordHash");

  if (!userList) {
    res.status(500).json({
      success: false,
    });
  }
  res.send(userList);
});

routerUser.get(`/:id`, async (req, res) => {
  const user = await User.findById(req.params.id).select("-passwordHash");

  if (!user) {
    res.status(500).json({
      message: "The user with the given ID was not found",
    });
  }
  res.status(200).send(user);
});

routerUser.put("/:id", async (req, res) => {
  const userExist = await User.findById(req.params.id);
  let newPassword;
  if (req.body.password) {
    newPassword = bcrypt.hashSync(req.body.password, 10);
  } else {
    newPassword = userExist.passwordHash;
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      email: req.body.email,
      passwordHash: newPassword,
      phone: req.body.phone,
      isAdmin: req.body.isAdmin,
      street: req.body.street,
      apartment: req.body.apartment,
      zip: req.body.zip,
      city: req.body.city,
      country: req.body.country,
    },
    {
      new: true,
    }
  );

  if (!user) {
    return res.status(404).send("the user cannot be updated");
  }

  res.send(user);
});

routerUser.post(`/`, async (req, res) => {
  let user = new User({
    name: req.body.name,
    email: req.body.email,
    passwordHash: bcrypt.hashSync(`${req.body.password}`, 10),
    phone: req.body.phone,
    isAdmin: req.body.isAdmin,
    street: req.body.street,
    apartment: req.body.apartment,
    zip: req.body.zip,
    city: req.body.city,
    country: req.body.country,
  });

  user = await user.save();

  if (!user) {
    return res.status(400).send("The user cannot be created");
  }

  res.send(user);
});

routerUser.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  const secret = process.env.SECRET;
  if (!user) {
    return res.status(400).send("User not found");
  }

  if (
    user &&
    bcrypt.compareSync(`${req.body.password}`, `${user.passwordHash}`)
  ) {
    const token = Jwt.sign(
      {
        userId: user.id,
        isAdmin: user.isAdmin,
      },
      secret,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).send({ user: user.email, token: token });
  } else {
    return res.status(400).send("Password is wrong");
  }
});

routerUser.post(`/register`, async (req, res) => {
  let user = new User({
    name: req.body.name,
    email: req.body.email,
    passwordHash: bcrypt.hashSync(`${req.body.password}`, 10),
    phone: req.body.phone,
    isAdmin: req.body.isAdmin,
    street: req.body.street,
    apartment: req.body.apartment,
    zip: req.body.zip,
    city: req.body.city,
    country: req.body.country,
  });

  user = await user.save();

  if (!user) {
    return res.status(400).send("The user cannot be created");
  }

  res.send(user);
});

routerUser.delete("/:id", (req, res) => {
  User.findByIdAndRemove(req.params.id)
    .then((user) => {
      if (user) {
        return res.status(200).json({
          success: true,
          message: "User is deleted",
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

routerUser.get("/get/count", async (req, res) => {
  const userCount = await User.countDocuments();

  if (!userCount) {
    res.status(500).json({ success: false });
  }

  res.send({
    userCount: userCount,
  });
});
