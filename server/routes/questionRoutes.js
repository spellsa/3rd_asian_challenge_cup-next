// 問題セット関連APIのルーティング定義
import express from "express";
import * as questionController from "../controllers/questionController.js";
import verifyIdToken from "../middlewares/verifyIdToken.js";
import {
  generateQuestionSetsLimiterShortTerm,
  generateQuestionSetsLimiterLongTerm,
  gradeFreeTextLimiterShortTerm,
  gradeFreeTextLimiterLongTerm,
} from "../middlewares/rateLimiter.js";

const router = express.Router();

// フロントエンドからの問題生成リクエストを受け取るAPI
router.post(
  "/generate-question-set",
  verifyIdToken,
  generateQuestionSetsLimiterShortTerm,
  generateQuestionSetsLimiterLongTerm,
  questionController.generateQuestionSet,
);

// 手動で問題セットを作成するAPI - 認証必須
router.post("/create-question-set", verifyIdToken, questionController.createQuestionSet);

// 固有IDから問題セットをJSON形式で返すAPI
router.get("/get-question-set-json", questionController.getQuestionSetJson);

// 記述問題の採点をするAPI
router.post(
  "/grade-free-text",
  verifyIdToken,
  gradeFreeTextLimiterShortTerm,
  gradeFreeTextLimiterLongTerm,
  questionController.gradeFreeText,
);

// 自分の作成した問題セットを取得するAPI - 認証必須
router.get("/get-my-questionSets", verifyIdToken, questionController.getMyQuestionSets);

// 問題セットを更新するAPI - 認証必須
router.put("/update-question-set", verifyIdToken, questionController.updateQuestionSet);

// 問題セットを削除するAPI - 認証必須
router.delete("/delete-question-set/:id", verifyIdToken, questionController.deleteQuestionSet);

export default router;
