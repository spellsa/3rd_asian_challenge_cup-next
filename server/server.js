// APIサーバの起動設定とSPA配信をまとめたエントリポイント
import express from "express";
import bearerToken from "express-bearer-token";
import "dotenv/config";
import questionRoutes from "./routes/questionRoutes.js";
import userRoutes from "./routes/userRoutes.js";

import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

import testRoutes from "./routes/testRoute.js";

// Expressアプリケーションの初期化
const app = express();

// CORSで自ホストを許可するため先にポート/オリジンを決定
const PORT = process.env.PORT || 5000;
const SERVER_ORIGIN = process.env.SERVER_ORIGIN || `http://localhost:${PORT}`;

// セキュリティヘッダー（GoogleログインとFirebase利用に必要な例外を最小限で許可）
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Reactのインラインスクリプト用（本番ではnonce推奨）
          "https://accounts.google.com",
          "https://accounts.google.com/gsi/client",
          "https://apis.google.com",
          "https://*.gstatic.com",
        ],
        // Google Fonts / GSI用のstyle-src拡張（style-src-elemフォールバック回避）
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Reactのインラインスタイル用
          "https://fonts.googleapis.com", // Google Fonts CSS
          "https://accounts.google.com", // GSIスタイル
        ],
        // フォントファイル許可
        fontSrc: [
          "'self'",
          "data:", // base64インラインフォント
          "https://fonts.gstatic.com", // Google Fontsファイル
        ],
        // One Tap iframe 用のframe-src定義
        frameSrc: [
          "'self'",
          "https://accounts.google.com", // GSI One Tap iframe
          "blob:", // file/blob framing（アップロードプレビュー等）
        ],
        // FedCM / Firebase API 用 connect-src
        connectSrc: [
          "'self'",
          "https://accounts.google.com", // FedCMエンドポイント
          "https://www.googleapis.com", // Google API
          "https://identitytoolkit.googleapis.com", // Firebase Auth: signInWithIdp 等
          "https://securetoken.googleapis.com", // Firebase Auth: token 関連
          "https://firebasestorage.googleapis.com", // Firebase Storage API / upload / download
          "https://storage.googleapis.com", // 別ホストの可能性
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:", // ローカルプレビュー用 blob URL
          "https://lh3.googleusercontent.com",
          "https://*.gstatic.com",
          "https://firebasestorage.googleapis.com", // Firebase Storage の画像配信
          "https://storage.googleapis.com",
        ],
      },
    },
    // Googleログイン完了後の連携を許可
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // Googleに正しい Origin を通知
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // 外部リソース（Firebase Storageの画像など）の読み込みを許可
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// trust proxy（プロキシ / nginx 背後で稼働する場合のみ有効化）
if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ミドルウェア: JSON + URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bearerToken());

// CORS: 環境変数 ALLOWED_ORIGINS をコンマ区切りで読む（未設定時はデフォルト値）
const defaultAllowed = [
  "http://localhost:3000",
  SERVER_ORIGIN,
  "http://aidy.xvps.jp",
  "https://aidy.xvps.jp",
  "http://aidy.xvps.jp:3000",
];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : defaultAllowed;

app.use(
  cors({
    origin: (origin, callback) => {
      // origin が無い（curl, same-origin navigations 等）は許可
      if (!origin) return callback(null, true);

      // 末尾スラッシュは無視して判定
      const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;

      // サーバ自身のオリジンや許可リストに一致するなら許可
      if (normalizedOrigin === SERVER_ORIGIN || ALLOWED_ORIGINS.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn("CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// API ルートの設定
app.use("/api", questionRoutes);
app.use("/api", userRoutes);
app.use("/api/test", testRoutes);

// 未定義 /api 以下にはJSONで404を返す（SPAの静的配信と分離）
app.use("/api", (req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal Server Error" });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// 静的ファイル配信（client/build）と SPA フォールバックは本番のみ有効化
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const clientBuildPath = path.join(__dirname, "../client/build");

  if (existsSync(clientBuildPath)) {
    // 静的ファイル（JS/CSS/imagesなど）
    app.use(express.static(clientBuildPath));

    // API以外のリクエストをindex.htmlにフォールバック（必ず最後）
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next(); // APIは通過させる
      }
      res.sendFile(path.join(clientBuildPath, "index.html"));
    });

    console.log("Production: Serving React build from", clientBuildPath);
  } else {
    throw new Error(`React build directory not found: ${clientBuildPath}`);
  }
} else {
  console.log("SPA static file serving disabled (development mode)");
}

// サーバーのポート設定と起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
