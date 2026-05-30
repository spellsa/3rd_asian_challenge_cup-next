// レートリミットの動作確認用エンドポイント
import express from "express";
import rateLimit from "express-rate-limit";
import verifyIdToken from "../middlewares/verifyIdToken.js";

const router = express.Router();

const testLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    // memo この部分は何？
    console.log("Rate limit keyGenerator called. ", req.user.uid);
    return req.user.uid;
  },
  message: "Too many requests from this IP, please try again after a minute.",
});

router.get("/ping", (req, res) => {
  res.status(200).json({ message: "pong" });
});

router.get("/test-rate-limit", verifyIdToken, testLimiter, (req, res) => {
  res.status(200).json({ message: "This is a rate-limited endpoint." });
});

export default router;
