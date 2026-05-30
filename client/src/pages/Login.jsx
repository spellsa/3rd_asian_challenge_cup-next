import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import { useAuth } from "../hooks/useAuth";
import { app } from "../services/firebase/firebase";
import "./Login.css";

/**
 * Googleログインページコンポーネント
 *
 * FedCM (Federated Credential Management) API対応
 * - Chrome 117以降で利用可能
 * - サードパーティCookieに依存しない認証フロー
 * - 2025年8月以降、Google One Tapで必須化予定
 *
 * 認証フロー:
 * 1. One Tapプロンプトを表示（ブラウザ右上）
 * 2. 同時にボタンも表示（フォールバック）
 * 3. どちらからでもログイン可能
 */
function Login() {
  const [status, setStatus] = useState("ログイン処理中...");
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth(app);
  const hasInitialized = useRef(false);

  // リダイレクト先を取得（デフォルトはトップページ）
  const params = new URLSearchParams(location.search);
  const redirectTo = params.get("redirect") || "/";

  /**
   * Google認証成功時のコールバック
   * ID TokenをFirebase Authenticationに渡してログイン
   */
  const handleCredentialResponse = async (response) => {
    try {
      const idToken = response.credential;
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      setStatus("ログイン成功!");
      setTimeout(() => navigate(redirectTo), 1500);
    } catch (error) {
      console.error("ログインエラー:", error.code, error.message);
      setStatus(`ログインに失敗しました: ${error.message}`);
    }
  };

  /**
   * Google Sign-Inボタンを描画
   */
  const renderSignInButton = () => {
    const buttonDiv = document.getElementById("google-signin-button");
    if (buttonDiv && window.google?.accounts?.id) {
      window.google.accounts.id.renderButton(buttonDiv, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 300,
        locale: "ja",
      });
    }
  };

  /**
   * Google Identity Services (GIS) を初期化
   */
  const initializeGoogleSignIn = () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Client IDの検証
    if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
      setStatus("エラー: Google Client IDが設定されていません");
      console.error("VITE_GOOGLE_CLIENT_ID が設定されていません");
      return;
    }

    // GISライブラリの読み込みを待機
    const checkInterval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(checkInterval);

        // GIS初期化（FedCM完全対応）
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,          // 自動選択は無効（ユーザー操作を要求）
          itp_support: true,           // Safari ITP対応
          use_fedcm_for_prompt: true,  // FedCM API使用（Chrome 117+）
        });

        // One Tapプロンプトを表示
        // FedCMでは表示されない場合があるのでコールバックは使用しない
        window.google.accounts.id.prompt();

        // ボタンを常に表示（フォールバック兼メイン）
        setStatus("Googleでログイン");
        renderSignInButton();
      }
    }, 100);

    // 10秒でタイムアウト
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!window.google?.accounts?.id) {
        setStatus("エラー: Googleサービスの読み込みに失敗しました");
      }
    }, 10000);
  };

  const { currentUser, loading } = useAuth();

  // コンポーネントマウント時に実行
  useEffect(() => {
    if (loading || hasInitialized.current) return;

    if (currentUser) {
      // 既にログイン済み
      setStatus("既にログインしています");
      setTimeout(() => navigate(redirectTo), 1000);
    } else {
      // 未ログイン → GIS初期化
      initializeGoogleSignIn();
    }
  }, [currentUser, loading, navigate, redirectTo]);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="../AIDY.svg" alt="AIDY" className="login-logo" />
          <h1 className="login-title">ようこそ</h1>
          <p className="login-subtitle">AIを活用した学習体験を始めましょう</p>
        </div>

        <div className="login-content">
          <div className="login-status">{status}</div>
          <div id="google-signin-button" className="google-button-wrapper"></div>
        </div>

        <div className="login-footer">
          <p className="login-info">
            ログインすることで、利用規約に同意したものとみなされます。
            <br />
            そもそも利用規約なんてないんだけどね
          </p>
        </div>
      </div>

      <div className="login-background">
        <div className="login-bg-circle circle-1"></div>
        <div className="login-bg-circle circle-2"></div>
        <div className="login-bg-circle circle-3"></div>
      </div>
    </div>
  );
}

export default Login;
