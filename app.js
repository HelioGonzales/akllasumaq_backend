import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose from "mongoose";
dotenv.config();

const app = express();
const api = process.env.API_URL;

/*  Middleware */
app.use(express.json());
app.use(morgan("tiny"));

/* Route */
app.get(`${api}/products`, (req, res) => {
  const product = {
    id: 1,
    name: "Soap",
    image: "some_url",
  };
  res.send(product);
});

app.post(`${api}/products`, (req, res) => {
  const newProduct = req.body;
  console.log(newProduct);
  res.send(newProduct);
});

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
