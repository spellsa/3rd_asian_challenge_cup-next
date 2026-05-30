// エラーレスポンスを環境別に整形して返す
export function sendError(res, error, statusCode = 500) {
  console.error("Error occurred:", error);

  const finalStatusCode = error.statusCode || statusCode;

  if (process.env.NODE_ENV === "development") {
    res.status(finalStatusCode).json({
      error: error.message || "An unexpected error occurred",
      stack: error.stack,
    });
  } else {
    if (finalStatusCode < 500) {
      res.status(finalStatusCode).json({
        error: error.message || "リクエスト処理中にエラーが発生しました。",
      });
    } else {
      res.status(finalStatusCode).json({
        error: "内部サーバーエラーが発生しました。管理者に連絡してください。",
      });
    }
  }
}
