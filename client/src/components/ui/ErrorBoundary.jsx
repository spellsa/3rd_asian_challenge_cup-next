import React from "react";

/**
 * レンダーエラーをキャッチし、アプリケーションのクラッシュを防ぐ境界コンポーネント。
 * エラー発生時にはフォールバックUIを表示し、再試行を可能にする。
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // 次回のレンダリングでフォールバックUIを表示するように状態を更新
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // エラーログ記録サービスに送信することも可能
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // 呼び出し元がフォールバックUIを指定していればそれを使用
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // デフォルトのフォールバックUI
      return (
        <div
          style={{
            padding: "20px",
            border: "1px solid #f5c6cb",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            fontSize: "0.9rem",
            margin: "10px 0",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0" }}>表示エラーが発生しました</h4>
          <p style={{ margin: "0 0 10px 0", fontFamily: "monospace", fontSize: "0.8rem" }}>
            {this.state.error && this.state.error.toString()}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: "5px 10px",
              backgroundColor: "#fff",
              border: "1px solid #721c24",
              color: "#721c24",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            再試行
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
