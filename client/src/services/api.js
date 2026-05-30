import { apiClient } from "../utils/apiClient";

export const api = {
  // 問題セットの取得
  getQuestionSetJson: (id) => apiClient.get("get-question-set-json", null, { id }),

  // 記述問題の採点
  gradeFreeText: (token, payload) => apiClient.post("grade-free-text", token, payload),

  // ユーザーの回答ログを保存
  saveUserAnswerLogs: (token, answerData) =>
    apiClient.post("save-user-answer-logs", token, answerData),

  // 経験値を付与
  giveExperience: (token, scoreData) => apiClient.post("give-experience", token, scoreData),

  // 問題セットの生成
  generateQuestionSet: (token, data) => apiClient.post("generate-question-set", token, data),

  // 手動で問題セットを作成
  createQuiz: (token, data) => apiClient.post("create-question-set", token, data),

  // 問題セットの更新
  updateQuestionSet: (token, payload) => apiClient.put("update-question-set", token, payload),

  // ユーザーが作成した問題セットの取得
  getMyQuestionSets: (token) => apiClient.get("get-my-questionSets", token),

  // 最近解いた問題セットの取得
  getRecentlyAnsweredQuestionSets: (token) =>
    apiClient.get("get-recently-answered-questionSets", token),

  // 最近間違えた問題セットの取得
  getRecentlyIncorrectQuestionSets: (token) =>
    apiClient.get("get-recently-incorrect-questionSets", token),

  // ユーザーレベルの取得
  getUserLevel: (token) => apiClient.get("get-user-level", token),

  // 問題セットの削除
  deleteQuestionSet: (token, id) => apiClient.delete(`delete-question-set/${id}`, token),
};
