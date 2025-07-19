const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validate");
const { body } = require("express-validator");
const unsubscribeController = require("../controllers/unsubscribe");
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password min 6 characters"),
  ],
  validateRequest,
  authController.register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validateRequest,
  authController.login
);

router.post("/logout", authMiddleware, authController.logout);
router.post("/request-reset", authController.requestPasswordReset);
router.post("/reset-password", authController.resetPassword);
router.get("/verify/:token", authController.verifyEmail);
router.get("/me", authMiddleware, authController.getMe);
router.put("/me", authMiddleware, authController.updateMe);
router.post("/change-password", authMiddleware, authController.changePassword);
router.post("/refresh", authController.refreshToken);
router.get("/unsubscribe", unsubscribeController.unsubscribe);
module.exports = router;
