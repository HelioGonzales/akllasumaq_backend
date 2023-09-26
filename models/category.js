import mongoose from "mongoose";

const categorySchema = mongoose.Schema({
  name: String,
  image: String,
  countInStock: {
    type: Number,
    required: true,
  },
});

export const Category = mongoose.model("Category", categorySchema);
