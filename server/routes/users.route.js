import { Router } from "express";
import {
  authenticateUser,
  claimUserReward,
  getProfilePicture,
  getUserData,
  tapBoost,
  userClicked,
} from "../controllers/users.controller.js";
import { authGuard } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/authenticate", authenticateUser);
router.get("/", authGuard, getUserData);
router.post("/click", authGuard, userClicked);
router.get("/profilePicture", authGuard, getProfilePicture);
router.patch("/claimReward", authGuard, claimUserReward);
router.patch("/tapboost", authGuard, tapBoost);

export default router;
