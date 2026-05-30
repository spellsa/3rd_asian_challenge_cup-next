# AIDY - AI学習支援プロジェクト

## 1. プロジェクト概要

AIDYは、AIを活用した問題生成・学習支援Webアプリケーションです。ユーザーはPDFや画像をアップロードするか、プロンプトを入力することで、Google Gemini AIが自動的に問題セットを生成します。生成された問題は解答可能で、記述問題はAIによる自動採点に対応しています。

### 主要機能
- **AI問題生成**: PDF/画像のアップロード、またはプロンプトから問題セットを自動生成
- **多様な問題形式**: 7種類の問題タイプ（選択、正誤、穴埋め、記述、計算、並べ替え、数値入力）
- **AI採点**: 記述問題をGemini AIが採点・解説
- **ユーザーレベルシステム**: 正答による経験値獲得とレベルアップ

---

## 2. 技術スタック

| 層 | 技術 | バージョン/備考 |
|---|---|---|
| **フロントエンド** | React | 19.1.0 |
| ビルドツール | Vite | 7.2.7 |
| ルーティング | react-router-dom | 7.6.2 |
| ドラッグ&ドロップ | @dnd-kit/core, @dnd-kit/sortable | 問題並べ替え用 |
| 数式レンダリング | KaTeX (react-katex, rehype-katex) | LaTeX記法対応 |
| Markdown | react-markdown, remark-gfm, remark-math | GitHub風Markdown |
| コードハイライト | highlight.js, rehype-highlight | 構文ハイライト |
| **バックエンド** | Express | 5.1.0 (ESM形式) |
| AI | Google Gemini API (@google/genai) | 1.5.1 |
| バリデーション | Zod | 4.1.12 |
| セキュリティ | helmet, cors, express-bearer-token | |
| **データベース** | Firebase Firestore | NoSQL |
| **認証** | Firebase Authentication | Googleログイン (FedCM対応) |
| **ストレージ** | Firebase Storage | 画像アップロード |

---

## 3. ディレクトリ構造

```
3rd_asichalle/
├── client/                     # Vite + React フロントエンド
│   ├── src/
│   │   ├── components/         # 再利用可能なUIコンポーネント
│   │   │   ├── layout/         # ヘッダー、メニュー等のレイアウト
│   │   │   ├── questions/      # 問題関連コンポーネント
│   │   │   └── ui/             # 汎用UIコンポーネント
│   │   ├── config/             # 定数・設定ファイル
│   │   ├── hooks/              # カスタムReact Hooks
│   │   ├── pages/              # ページコンポーネント
│   │   ├── services/           # API通信、Firebase設定
│   │   ├── styles/             # グローバルCSS
│   │   └── utils/              # ユーティリティ関数
│   └── package.json
├── server/                     # Express バックエンド
│   ├── controllers/            # HTTPリクエストハンドラ
│   ├── routes/                 # ルーティング定義
│   ├── services/               # ビジネスロジック層
│   ├── middlewares/            # 認証等のミドルウェア
│   ├── utils/                  # ユーティリティ（プロンプト、スキーマ等）
│   ├── firebase/               # Firebase Admin SDK設定
│   ├── config/                 # サーバー設定定数
│   └── server.js               # エントリポイント
├── firestore.rules             # Firestore セキュリティルール
├── storage.rules               # Firebase Storage セキュリティルール
└── firebase.json               # Firebase設定
```

---

## 4. データモデル（Firestore）

### `questionSets/{setId}`
問題セットを格納するコレクション。

```typescript
{
  title: string;              // タイトル
  outline: string;            // 概要
  subjectName: string;        // 科目名（省略可）
  createdUserId: string;      // 作成者のUID
  createdAt: string;          // 作成日時（ISO形式）
  questions: Question[];      // 問題の配列
}
```

### `users/{userId}/answerLogs/{logId}`
ユーザーの回答ログを格納するサブコレクション。

```typescript
{
  questionSetId: string;           // 解答した問題セットのID
  isExitIncorrectQuestionIds: boolean;  // 不正解があるか
  incorrectQuestionIds: string[];  // 不正解の問題IDリスト
  incorrectAnswerDetails: object[]; // 不正解の詳細情報
  answeredAt: string;              // 回答日時（ISO形式）
}
```

### `users/{userId}`
ユーザー情報（経験値・レベル等）。

---

## 5. 問題タイプ一覧

| タイプ | 説明 | answerの形式 |
|--------|------|--------------|
| `true_false` | 正誤問題 | `boolean` |
| `single_choice` | 単一選択 | `string`（選択肢のテキスト） |
| `multiple_choice` | 複数選択 | `boolean[]`（選択肢ごとの正誤） |
| `fill_in_the_blank` | 穴埋め | `string`（問題文中の`[[:答え:]]`形式で埋め込み） |
| `free_text_input` | 記述式 | `string`（AI採点に対応） |
| `numeric_input` | 数値入力 | `number` |
| `calculation` | 計算問題 | 変数定義 + 数式（mathjsで評価） |
| `ordering` | 並べ替え | `string[]`（正しい順序） |

---

## 6. 認証・認可ルール

### Firestore Rules
- **users/{userId}**: 本人のみ読み書き可能（サブコレクション含む）
- **questionSets/{setId}**: 作成は認証済みユーザー全員、読み取り・更新・削除は作成者のみ

### APIエンドポイント認証
すべてのAPIエンドポイント（公開エンドポイント以外）はFirebase ID Tokenによるベアラー認証が必要。

---

## 7. ファイル詳細説明

### 7.1 フロントエンド: pages/

#### `Top.jsx`
- **役割**: ランディングページ（未ログイン時のトップ）
- **機能**:
  - アプリの紹介・機能説明を表示
  - タイプライター効果による演出
  - ログイン/ダッシュボードへのナビゲーション
- **依存**: `useAuth`フック

#### `Login.jsx`
- **役割**: Googleログインページ
- **機能**:
  - Google Identity Services (GIS) を使用したログイン
  - FedCM (Federated Credential Management) API対応（Chrome 117+）
  - One Tapプロンプトとボタンの両方を表示
  - ログイン後のリダイレクト処理
- **依存**: Firebase Auth, `useAuth`フック

#### `Dashboard.jsx`
- **役割**: ログイン後のメイン画面
- **機能**:
  - 最近解いた問題セットの一覧表示
  - 自分が作成した問題セットの一覧表示
  - 問題セットの削除（確認モーダル付き）
  - 新規問題作成画面への導線
- **依存**: `api.js`, `useAuth`, `ConfirmModal`, `AppButton`

#### `Create.jsx`
- **役割**: 問題セット作成画面
- **機能**:
  - 画像/PDFのアップロード（複数ファイル対応）
  - プロンプト入力による問題生成
  - 問題数・形式（問題タイプ）の指定
  - Firebase Storageへのファイルアップロード（圧縮処理付き）
  - 手動作成モード
- **依存**: `api.js`, Firebase Storage, `browser-image-compression`

#### `Question.jsx`
- **役割**: 問題解答画面
- **機能**:
  - 問題セットの取得・表示
  - 問題タイプに応じたコンポーネント（`QuestionSingle_choice`, `QuestionOrdering`等）の動的切り替え
  - 回答の収集・送信
  - AI採点利用時のログイン促進バナー表示
- **依存**: 各`Question*`コンポーネント, `MemoizedQuestionItem`（メモ化）

#### `Answer.jsx`
- **役割**: 解答結果・採点画面
- **機能**:
  - ローカル採点（`evaluateQuestionAnswer`による即時採点）
  - AI採点リクエスト（記述問題、`useGeminiForGrading`がtrue）
  - 採点結果の表示（正誤、解説、AI解説）
  - 回答ログの保存
  - 経験値付与
- **依存**: `api.js`, `grading.js`, `AnswerResult`

#### `EditQuiz.jsx`
- **役割**: 問題セット編集画面
- **機能**:
  - 問題のドラッグ&ドロップ並べ替え（@dnd-kit使用）
  - 問題の追加・削除・複製
  - 問題タイプの変更（確認モーダル付き）
  - 画像のアップロード・削除
  - 変更の保存
- **依存**: `useQuizEditor`フック, `QuestionEditor`, `SortableQuestionItem`

#### `Mypage.jsx`
- **役割**: マイページ（プロフィール）
- **機能**:
  - ユーザー名・プロフィール画像の変更
  - レベル・経験値の表示
  - 自分が作成した問題セット一覧
- **依存**: Firebase Auth (`updateProfile`), `api.js`

---

### 7.2 フロントエンド: components/

#### `components/questions/AnswerResult.jsx`
- **役割**: 個別問題の採点結果表示
- **機能**:
  - 問題タイプごとの結果レンダリング（正誤アイコン、正解表示、ユーザー回答表示）
  - AI採点結果の表示（説明文含む）
  - 計算問題の変数値表示
  - 穴埋め問題の空欄ごとの正誤表示
- **依存**: `LatexRenderer`, `grading.js`, `quizUtils.js`

#### `components/questions/QuestionEditor.jsx`
- **役割**: 問題編集フォーム
- **機能**:
  - 問題タイプに応じた入力欄の切り替え
  - LaTeXプレビュー
  - 画像アップロード（Firebase Storage）
  - 選択肢編集、正解設定
  - オプションエディタ（`OptionsEditor`, `OrderingEditor`等）の呼び出し
- **依存**: `LatexRenderer`, `quizUtils.js`, 各種パーツエディタ

#### `components/questions/Question*.jsx`
各問題タイプに対応した解答用コンポーネント群:
- `QuestionTrue_false.jsx`: 正誤問題
- `QuestionSingle_choice.jsx`: 単一選択
- `QuestionMultiple_choice.jsx`: 複数選択
- `QuestionFill_in_the_blank.jsx`: 穴埋め問題
- `QuestionFree_text_input.jsx`: 記述問題
- `QuestionOrdering.jsx`: 並べ替え問題
- `QuestionCalculation.jsx`: 計算問題（変数のランダム値生成、mathjs評価）

#### `components/ui/LatexRenderer.jsx`
- **役割**: 数式・Markdown レンダラー
- **機能**:
  - KaTeX（`$...$`）による数式表示
  - remarkMath + rehypeKatex でMarkdown内数式をサポート
  - 穴埋め問題の入力欄埋め込み（`[[:答え:]]`形式をパース）
  - コードブロックのシンタックスハイライト（highlight.js）
- **依存**: react-markdown, rehype-katex, rehype-highlight

#### `components/ui/NotificationContext.jsx`
- **役割**: トースト通知のグローバル状態管理
- **機能**:
  - `showNotification(message, type)` でアプリ全体からトースト表示
  - 3秒後に自動消去
- **使用法**: `useNotification`フックで取得

#### `components/ui/ConfirmModal.jsx`
- **役割**: 確認ダイアログモーダル
- **機能**: 削除等の破壊的操作前の確認

#### `components/ui/AppButton.jsx`
- **役割**: ダッシュボードの問題セット一覧表示
- **機能**: 最近解いた問題・自分の問題のカード表示

---

### 7.3 フロントエンド: hooks/

#### `useAuth.js`
- **役割**: Firebase認証状態の監視
- **戻り値**: `{ currentUser, loading }`
- **使用法**: ログイン状態の確認、ユーザー情報の取得

#### `useQuizEditor.js`
- **役割**: 問題セット編集の状態管理とロジック
- **機能**:
  - 問題セットの取得・正規化
  - ドラッグ&ドロップ処理（@dnd-kit）
  - 問題のCRUD操作
  - 画像削除・タイプ変更の確認モーダル状態管理
  - 保存処理（API呼び出し）
- **依存**: `api.js`, `quizUtils.js`

---

### 7.4 フロントエンド: utils/

#### `grading.js`
- **役割**: 問題の採点ロジック（クライアントサイド）
- **主要エクスポート**:
  - `evaluateQuestionAnswer({question, userAnswer, options})`: 問題タイプに応じた採点
  - `VERDICT_SOURCE`: 採点ソース識別用定数（AI, MANUAL, AI_PENDING等）
  - `parseOrderingSequence(value)`: 並べ替え回答のパース
  - `extractFreeTextValue(raw)`: 記述回答のテキスト抽出
- **対応問題タイプ**: 全7種類

#### `quizUtils.js`
- **役割**: 問題データの正規化・変換ユーティリティ
- **主要エクスポート**:
  - `normalizeQuestionData(data)`: バックエンドデータをエディタ互換形式に変換
  - `createNewQuestion()`: 新規問題の初期データ生成
  - `getInitialQuestionProps(newType, currentQuestion)`: タイプ変更時の初期値取得
  - `parseFillInTheBlank(text)`: 穴埋め問題のパース（`[[:答え:]]`形式）
  - `extractAnswersFromText(text)`: 穴埋め問題から正解リスト抽出
  - `applyVariables(text, scope)`: 計算問題の変数置換（`{{var:name}}`形式）
  - `CALCULATION_VARIABLE_REGEX`: 変数抽出用正規表現

#### `apiClient.js`
- **役割**: HTTPクライアント（fetch wrapper）
- **機能**:
  - ベースURL管理
  - Bearer Token自動付与
  - エラーハンドリング
  - GET/POST/PUT/DELETEメソッド

---

### 7.5 フロントエンド: services/

#### `api.js`
- **役割**: APIエンドポイントの呼び出しを抽象化
- **主要メソッド**:
  - `getQuestionSetJson(id)`: 問題セット取得
  - `gradeFreeText(token, payload)`: 記述問題AI採点
  - `generateQuestionSet(token, data)`: AI問題生成
  - `createQuiz(token, data)`: 手動問題作成
  - `updateQuestionSet(token, payload)`: 問題セット更新
  - `deleteQuestionSet(token, id)`: 問題セット削除
  - `saveUserAnswerLogs(token, answerData)`: 回答ログ保存
  - `giveExperience(token, scoreData)`: 経験値付与
  - `getUserLevel(token)`: ユーザーレベル取得
  - `getMyQuestionSets(token)`: 自分の問題セット取得
  - `getRecentlyAnsweredQuestionSets(token)`: 最近解いた問題取得

#### `services/firebase/`
- Firebase設定・初期化（Auth, Firestore, Storage）

---

### 7.6 バックエンド: server/

#### `server.js`
- **役割**: Expressアプリケーションのエントリポイント
- **機能**:
  - セキュリティヘッダー設定（helmet: CSP, CORP等）
  - CORS設定（許可オリジン管理）
  - APIルート登録（`/api`以下）
  - 本番環境でのSPA静的配信
- **CSP設定**: Google Identity Services, Firebase, Google Fontsを許可

#### `controllers/questionController.js`
- **役割**: 問題セット関連のHTTPハンドラ
- **エンドポイント**:
  - `POST /generate-question-set`: AI問題生成
  - `GET /get-question-set-json`: 問題セット取得
  - `POST /grade-free-text`: 記述問題AI採点
  - `GET /get-my-questionSets`: 自分の問題セット取得
  - `PUT /update-question-set`: 問題セット更新
  - `DELETE /delete-question-set/:id`: 問題セット削除
  - `POST /create-question-set`: 手動問題作成

#### `controllers/userController.js`
- **役割**: ユーザー関連のHTTPハンドラ
- **エンドポイント**:
  - `POST /save-user-answer-logs`: 回答ログ保存
  - `GET /get-recently-answered-questionSets`: 最近解いた問題取得
  - `GET /get-recently-incorrect-questionSets`: 最近間違えた問題取得
  - `POST /give-experience`: 経験値付与
  - `GET /get-user-level`: レベル取得

#### `services/geminiService.js`
- **役割**: Google Gemini APIとの通信
- **主要関数**:
  - `uploadFileToGemini(filePath)`: ファイルアップロード
  - `generateQuestionSetWithGemini(files, prompt, count, formats)`: ファイルベース問題生成
  - `generateQuestionSetWithPrompt(prompt, count, formats)`: プロンプトのみ問題生成
  - `gradeFreeTextQuestion(questions)`: 記述問題採点
  - `parseGeminiResponseText(rawText)`: レスポンスのJSONパース（LaTeXエスケープ復元）
  - `sanitizeUserPrompt(prompt)`: プロンプトインジェクション対策

#### `services/questionService.js`
- **役割**: 問題セットのビジネスロジック
- **主要関数**:
  - `handleGenerateQuestionSetRequest(params, userId)`: 問題生成リクエスト処理
  - `formatQuestionSet(json, subjectName, userId)`: レスポンス整形（ID付与等）
  - `saveQuestionSetToDatabase(questionSet)`: Firestore保存
  - `updateQuestionSetInDatabase(id, userId, data)`: 更新
  - `deleteQuestionSetFromDatabase(id, userId)`: 削除（Storage画像も削除）
  - `createManualQuestionSet(data, userId)`: 手動作成

#### `services/userService.js`
- **役割**: ユーザーデータのビジネスロジック
- **主要関数**:
  - `saveUserAnswerLog(userId, logData)`: 回答ログ保存
  - `getRecentlyAnsweredQuestionSets(userId)`: 最近解いた問題取得
  - `getRecentlyIncorrectQuestionSets(userId)`: 最近間違えた問題取得
  - `getMyQuestionSets(userId)`: 自分の問題セット取得

#### `services/playerLevelService.js`
- **役割**: レベル・経験値システム
- **主要関数**:
  - `grantExperience(userId, correctCount)`: 経験値付与・レベル計算
  - `getUserLevel(userId)`: レベル情報取得

#### `utils/prompts.js`
- **役割**: Gemini API用プロンプトテンプレート
- **主要テンプレート**:
  - `systemPromptTemplate`: 問題生成用システムプロンプト（問題タイプの詳細説明、LaTeX記法、プロンプトインジェクション対策）
  - `gradingSystemPromptTemplate`: 採点用システムプロンプト

#### `utils/schemas.js`
- **役割**: Gemini API用レスポンススキーマ定義
- **内容**: 各問題タイプのJSONスキーマ（`questionSetSchema`）

#### `utils/validators.js`
- **役割**: Zodによるリクエストバリデーションスキーマ
- **主要スキーマ**:
  - `generateQuestionSetSchema`: 問題生成リクエスト
  - `gradeFreeTextSchema`: 採点リクエスト
  - `updateQuestionSetSchema`: 更新リクエスト
  - `createQuestionSetSchema`: 作成リクエスト

---

## 8. コーディング規約・原則

### 必須遵守事項
- **KISS原則**: シンプルな実装を心がける
- **DRY原則**: コードの重複を避ける
- **リーダブルコード**: 可読性を重視
- **コメント**: 日本語で記述、レビュワーを意識した説明

### React/JavaScript
- 関数コンポーネント + Hooks を使用
- メモ化（`React.memo`, `useMemo`, `useCallback`）によるパフォーマンス最適化
- カスタムフックによるロジック分離

### ファイル構成
- ページコンポーネント: `pages/PageName.jsx` + `pages/PageName.css`
- 再利用コンポーネント: `components/カテゴリ/ComponentName.jsx`
- ビジネスロジック: `services/`, `utils/`

---

## 9. 環境変数

### クライアント側 (`client/.env`)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GOOGLE_CLIENT_ID=     # Google Identity Services用
```

### サーバー側 (`server/.env`)
```
GEMINI_API_KEY=             # Google Gemini API Key
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=            # CORS許可オリジン（カンマ区切り）
```

---

## 10. API エンドポイント一覧

### 問題関連 (`questionRoutes.js`)
| メソッド | パス | 認証 | 説明 |
|----------|------|------|------|
| GET | `/api/get-question-set-json` | 不要 | 問題セット取得 |
| POST | `/api/generate-question-set` | 必要 | AI問題生成 |
| POST | `/api/create-question-set` | 必要 | 手動問題作成 |
| PUT | `/api/update-question-set` | 必要 | 問題セット更新 |
| DELETE | `/api/delete-question-set/:id` | 必要 | 問題セット削除 |
| POST | `/api/grade-free-text` | 必要 | 記述問題AI採点 |
| GET | `/api/get-my-questionSets` | 必要 | 自分の問題取得 |

### ユーザー関連 (`userRoutes.js`)
| メソッド | パス | 認証 | 説明 |
|----------|------|------|------|
| POST | `/api/save-user-answer-logs` | 必要 | 回答ログ保存 |
| GET | `/api/get-recently-answered-questionSets` | 必要 | 最近解いた問題取得 |
| GET | `/api/get-recently-incorrect-questionSets` | 必要 | 最近間違えた問題取得 |
| POST | `/api/give-experience` | 必要 | 経験値付与 |
| GET | `/api/get-user-level` | 必要 | レベル取得 |

---

## 11. 特殊な記法・フォーマット

### 穴埋め問題の記法
問題文中で `[[:答え:]]` の形式を使用。
```
水の化学式は[[:H2O:]]である。
```

### 計算問題の変数記法
問題文中で `{{var:変数名}}` を使用。実行時に `variables` で定義された範囲からランダム値が代入される。
```javascript
{
  question: "$A = {{var:A}}$、$k = {{var:k}}$ のとき、$P = A \\times k$ を求めよ。",
  variables: {
    A: { min: 1, max: 10, step: 1 },
    k: { min: 0.1, max: 1.0, step: 0.1 }
  },
  formula: "A * k"  // mathjsで評価
}
```

### LaTeX数式
- インライン: `$E = mc^2$`
- ブロック数式は非推奨（インライン形式を使用）
