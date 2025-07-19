const User = require("../models/User");

exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { receiveEmails: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`User unsubscribed: ${email}`);
    res.json({ message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("Unsubscribe failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};
