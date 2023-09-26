import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose from "mongoose";
import cors from "cors";

import { routerProduct } from "./routers/products.js";
import { routerCategory } from "./routers/categories.js";
import { routerOrder } from "./routers/orders.js";
import { routerUser } from "./routers/users.js";

dotenv.config();

const app = express();
const api = process.env.API_URL;

app.use(cors());
app.options("*", cors());

/*  Middleware */
app.use(express.json());
app.use(morgan("tiny"));

/* Routers */
app.use(`${api}/products`, routerProduct);
app.use(`${api}/categories`, routerCategory);
app.use(`${api}/orders`, routerOrder);
app.use(`${api}/users`, routerUser);

mongoose
  .connect(process.env.CONNECTION_STRING)
  .then(() => {
    console.log("Database connection is ready");
  })
  .catch((err) => {
    console.log(err);
  });

/* Server */
app.listen(3000, () => {
  console.log("server is runing http://localhost:3000");
});
