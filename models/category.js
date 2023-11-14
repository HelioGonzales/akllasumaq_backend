import mongoose from "mongoose";

const categorySchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
  },
  color: {
    type: String,
  },
  image: {
    type: String,
    default: "",
  },
});

export const Category = mongoose.model("Category", categorySchema);
