// ユーザー回答/レベル関連APIのルーティング定義
import express from "express";
import * as userController from "../controllers/userController.js";
import verifyIdToken from "../middlewares/verifyIdToken.js";

const router = express.Router();

// ユーザーの回答ログを保存するAPI - 認証必須
router.post("/save-user-answer-logs", verifyIdToken, userController.saveUserAnswerLogs);

// ユーザーが最近解いた問題を取得するAPI - 認証必須
router.get(
  "/get-recently-answered-questionSets",
  verifyIdToken,
  userController.getRecentlyAnsweredQuestionSets
);

// ユーザーが最近間違えた問題を取得するAPI - 認証必須
router.get(
  "/get-recently-incorrect-questionSets",
  verifyIdToken,
  userController.getRecentlyIncorrectQuestionSets
);

// ユーザーの正答数に応じて経験値を付与するAPI - 認証必須
router.post("/give-experience", verifyIdToken, userController.giveExperience);

// ユーザーのレベルを取得するAPI - 認証必須
router.get("/get-user-level", verifyIdToken, userController.getUserLevel);

export default router;
