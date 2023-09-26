import mongoose from "mongoose";

const orderSchema = mongoose.Schema({
  name: String,
  image: String,
  countInStock: {
    type: Number,
    required: true,
  },
});

export const Order = mongoose.model("Order", orderSchema);
