import mongoose from "mongoose";
import users from "../Modals/Auth.js";

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      return res.status(201).json({ result: newUser });
    } else {
      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid user ID..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateplan = async (req, res) => {
  const { id: _id } = req.params;
  const { plan } = req.body;
  const ALLOWED_PLANS = ["free", "bronze", "silver", "gold"];
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid user ID..." });
  }
  if (!plan || !ALLOWED_PLANS.includes(plan.toLowerCase())) {
    return res.status(400).json({ message: `Invalid plan. Must be one of: ${ALLOWED_PLANS.join(", ")}` });
  }
  if (plan.toLowerCase() !== "free") {
    return res.status(403).json({
      message: "Paid plans require payment. Use the subscription checkout flow.",
    });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          plan: "free",
          planExpiresAt: null,
        },
      },
      { new: true }
    );
    return res.status(200).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
