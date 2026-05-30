// APIのベースURLを環境変数優先で決定（末尾スラッシュは除去）
const envApi = import.meta.env.VITE_API_BASE_URL;

// 優先: 環境変数 -> 相対パス '/api'（同一オリジン想定）
export const API_BASE_URL =
  envApi && envApi.trim().length
    ? envApi.replace(/\/$/, "") // 末尾スラッシュを除去
    : "/api";

export const UI_TEXT = {
  CORRECT: "正解!",
  INCORRECT: "不正解",
  YOUR_ANSWER: "あなたの回答: ",
  MODEL_ANSWER: "模範解答: ",
  AI_EXPLANATION: "AIによる解説: ",
  EXPLANATION: "解説:",
  QUESTION_PREFIX: "問題",
};
