import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  name: String,
  image: String,
  countInStock: {
    type: Number,
    required: true,
  },
});

export const User = mongoose.model("User", userSchema);
