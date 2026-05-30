// ユーザーの回答ログや経験値に関するHTTPハンドラ
import * as userService from "../services/userService.js";
import * as playerLevelService from "../services/playerLevelService.js";

export async function saveUserAnswerLogs(req, res) {
  const { questionSetId, incorrectQuestionIds, incorrectAnswerDetails } = req.body;
  console.log(
    "ユーザーの回答ログを保存するリクエストを受け取りました。",
    questionSetId,
    incorrectQuestionIds,
    incorrectAnswerDetails
  );
  console.log("ユーザーID:", req.user.uid);

  if (!questionSetId) {
    return res.status(400).json({ error: "有効な形式のquestionSetIdが必要です。" });
  }

  try {
    // 実際に保存する回答ログのオブジェクトを作成
    const log = {
      questionSetId,
      isExitIncorrectQuestionIds: incorrectQuestionIds.length > 0, // 不正解の問題があるときはtrue
      incorrectQuestionIds,
      incorrectAnswerDetails,
      answeredAt: new Date().toISOString(), // 解答日時をISO形式で保存
    };

    const answerLogId = await userService.saveUserAnswerLog(req.user.uid, log);

    res
      .status(200)
      .json({ message: "ユーザーの回答ログが保存されました。", answerLogId: answerLogId });
  } catch (error) {
    console.error("ユーザーの回答ログの保存に失敗しました。:", error);
    res.status(500).json({ error: "ユーザーの回答ログの保存に失敗しました。" });
  }
}

export async function getRecentlyAnsweredQuestionSets(req, res) {
  console.log("最近解いた問題の取得リクエストを受け付けました。", req.user.uid);

  try {
    const results = await userService.getRecentlyAnsweredQuestionSets(req.user.uid);
    res.status(200).json(results);
  } catch (error) {
    console.error("最近解いた問題の取得に失敗しました。:", error);
    res.status(500).json({ error: "最近解いた問題の取得に失敗しました。" });
  }
}

export async function getRecentlyIncorrectQuestionSets(req, res) {
  console.log("最近間違えた問題の取得リクエストを受け付けました。", req.user.uid);

  try {
    const results = await userService.getRecentlyIncorrectQuestionSets(req.user.uid);
    console.log("最近間違えた問題を取得しました:", results);
    res.status(200).json(results);
  } catch (error) {
    console.error("最近間違えた問題の取得に失敗しました。:", error);
    res.status(500).json({ error: "最近間違えた問題の取得に失敗しました。" });
  }
}

export async function giveExperience(req, res) {
  console.log("ユーザーの正答数に応じて経験値を付与するリクエストを受け付けました。", req.user.uid);

  const { correctAnswersCount } = req.body;

  // 正答数が数値であることを確認
  if (typeof correctAnswersCount !== "number") {
    return res.status(400).json({ error: "不正なリクエストです。" });
  }

  try {
    const { newXp, newLevel, xpToNextLevel } = await playerLevelService.grantExperience(
      req.user.uid,
      correctAnswersCount
    );

    console.log("ユーザーの経験値を更新しました。", req.user.uid);
    res.status(200).json({
      message: "経験値を付与しました。",
      totalExperience: newXp,
      currentLevel: newLevel,
      xpToNextLevel,
    });
  } catch (error) {
    console.error("経験値の付与に失敗しました。:", error);
    res.status(500).json({ error: "経験値の付与に失敗しました。" });
  }
}

export async function getUserLevel(req, res) {
  console.log("ユーザーのレベル取得リクエストを受け付けました。", req.user.uid);

  try {
    const { currentExperience, currentLevel, xpToNextLevel } =
      await playerLevelService.getUserLevel(req.user.uid);
    res.status(200).json({
      message: "ユーザーのレベル情報を取得しました。",
      totalExperience: currentExperience,
      currentLevel,
      xpToNextLevel,
    });
  } catch (error) {
    console.error("ユーザーのレベル取得に失敗しました。:", error);
    res.status(500).json({ error: "ユーザーのレベル取得に失敗しました。" });
  }
}
