// react関連のインポート
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// css, コンポーネントのインポート
import "./Create.css";
import Menu from "../components/layout/Menu";
import LoadingDot from "../components/ui/LoadingDot";
// データベース関連のインポート(firebase.jsからインポート)
import { storageService } from "../services/firebase/storageService";
import { auth } from "../services/firebase/firebase";
import { useAuth } from "../hooks/useAuth";
import { useNotification } from "../components/ui/NotificationContext";
import { FaFilePdf } from "react-icons/fa6";
import { FaImages } from "react-icons/fa";
import { RiAiGenerate } from "react-icons/ri";
import { api } from "../services/api";

function CreateQuestion() {
  // ユーザー情報
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const [mode, setMode] = useState("select"); // 画面モード(select/ai/manual)

  // 問題を作成中かを判断するbool
  const [isGenerating, setIsGenerating] = useState(false);

  // ロード中かどうかのbool
  const [loading, setLoading] = useState(true);

  // input要素への参照（ボタンから間接的にclickするため）
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // 生成されたクイズIDを保存するstate
  const [generatedQuizId, setGeneratedQuizId] = useState(null);

  // ファイルを保存するstate（複数ファイル対応）
  const [selectedFiles, setSelectedFiles] = useState([]);

  // プレビュー用のURLを保存するstate（配列で保持）
  const [imageUrl, setImageUrl] = useState(null); // 画像用のURL配列
  const [pdfUrl, setPdfUrl] = useState(null); // PDF用のURL配列

  const navigate = useNavigate();

  // 利用可能な問題形式の定義（全7種類）
  const availableFormats = [
    { value: "true_false", label: "正誤問題", description: "正誤を選ぶ問題" },
    { value: "fill_in_the_blank", label: "穴埋め", description: "空欄に語句を入れる" },
    { value: "free_text_input", label: "記述式", description: "自由記述の問題" },
    { value: "single_choice", label: "単一選択", description: "選択肢から正しいものを1つ選ぶ" },
    {
      value: "multiple_choice",
      label: "複数選択",
      description: "選択肢から複数の正しいものを選ぶ",
    },
    {
      value: "numeric_input",
      label: "数値入力",
      description: "数値を入力する問題（計算問題など）",
    },
    { value: "ordering", label: "並べ替え", description: "選択肢を正しい順番に並べる" },
    { value: "calculation", label: "計算問題", description: "変数を定義して計算式を設定する" },
  ];

  // 新規: プロンプト、問題数、フォーマット選択用のstate（初期値: 問題数15、全形式選択）
  const [prompt, setPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(15);
  const [selectedFormats, setSelectedFormats] = useState(availableFormats.map((f) => f.value));



  // 画像ファイルが選択されたときの処理（複数対応）
  const handleImageChange = (event) => {
    const files = Array.from(event.target.files).filter((file) => file.type.startsWith("image/"));
    if (files.length > 0) {
      const urls = files.map((file) => URL.createObjectURL(file)); // 各画像のプレビューURL作成
      setSelectedFiles(files); // 複数ファイルをstateに保存
      setImageUrl(urls); // プレビュー用
      setPdfUrl(null); // PDFの表示はクリア
    }
    event.target.value = null; // 同じファイルを再選択できるようにする
  };

  // PDFファイルが選択されたときの処理（複数対応）
  const handlePdfChange = (event) => {
    const files = Array.from(event.target.files).filter((file) => file.type === "application/pdf");
    if (files.length > 0) {
      const urls = files.map((file) => URL.createObjectURL(file)); // 各PDFのプレビューURL作成
      setSelectedFiles(files); // 複数ファイルをstateに保存
      setPdfUrl(urls);
      setImageUrl(null); // 画像の表示はクリア
    }
    event.target.value = null; // 同じファイルを再選択できるようにする
  };

  // 問題のジェネレートとファイルをデータベースに送信（複数ファイル対応）
  const handleGenerateQuestions = async () => {
    try {
      // ファイルもプロンプトもない時
      if ((!selectedFiles || selectedFiles.length === 0) && !prompt.trim()) {
        showNotification("ファイルまたはプロンプトを入力してください。", "warning");
        return;
      }

      // 問題形式が選択されていない時
      if (selectedFormats.length === 0) {
        showNotification("少なくとも1つの問題形式を選択してください。", "warning");
        return;
      }

      setIsGenerating(true); //生成中と表示するためにisGeneratingをtrueに
      setLoading(true);

      const token = await currentUser.getIdToken(); // Tokenを保存
      let downloadURLs = [];

      // ファイルがある場合はアップロード
      if (selectedFiles && selectedFiles.length > 0) {
        downloadURLs = await storageService.uploadFilesToStorage(selectedFiles);
      }

      // ペイロードを組み立て（downloadURLs, prompt, questionCount, formats, subjectName）
      const payload = {
        ...(downloadURLs.length > 0 && { downloadURLs }),
        ...(prompt.trim() && { prompt: prompt.trim() }),
        ...(questionCount > 0 && { questionCount }),
        ...(selectedFormats.length > 0 && { formats: selectedFormats }),
      };

      const responseData = await api.generateQuestionSet(token, payload);
      // console.log(responseData); // jsonファイルの中身を確認

      const address = responseData.id;

      if (address) {
        setGeneratedQuizId(address);
      } else {
        showNotification("idの取得に失敗しました", "error");
        throw new Error("アドレスがレスポンスに含まれていません");
      }
    } catch (error) {
      console.error("アップロード失敗:", error);
      showNotification("問題生成に失敗しました: " + error.message, "error");
      setIsGenerating(false);
    } finally {
      setLoading(false); // エラーが発生or正常に動作した後にロード中フラグを下げる
    }
  };

  // 手動作成処理
  const handleManualCreate = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setIsGenerating(true);

      const token = await currentUser.getIdToken();

      // 空の問題セット構造
      const emptyQuiz = {
        title: "無題のクイズ",
        questions: [],
        createdAt: new Date().toISOString(),
        subjectName: "未分類",
        outline: "手動作成された問題セット",
      };

      // API経由で保存
      const response = await api.createQuiz(token, emptyQuiz);
      const newQuizId = response.id;

      navigate(`/edit/${newQuizId}`);
    } catch (error) {
      console.error("手動作成エラー:", error);
      showNotification("作成に失敗しました: " + error.message, "error");
      setIsGenerating(false);
      setLoading(false);
    }
  };

  // フォーマット選択のトグル
  const handleFormatToggle = (formatValue) => {
    setSelectedFormats((prev) =>
      prev.includes(formatValue) ? prev.filter((f) => f !== formatValue) : [...prev, formatValue]
    );
  };

  if (mode === "select") {
    return (
      <div className="create-page-select">
        <Menu />
        <div className="modeSelectionContainer">
          <h1 className="modeSelectionTitle">問題の作成方法を選択</h1>
          <div className="modeCards">
            <div className="modeCard" onClick={() => setMode("ai")}>
              <div className="modeIcon">
                <RiAiGenerate />
              </div>
              <h2 className="modeTitle">AIで作成</h2>
              <p className="modeDescription">
                PDFや画像、テキストから
                <br />
                AIが自動で問題を生成します
              </p>
            </div>
            <div className="modeCard" onClick={handleManualCreate}>
              <div className="modeIcon">
                <FaImages />
              </div>
              <h2 className="modeTitle">手動で作成</h2>
              <p className="modeDescription">
                ゼロから自分で
                <br />
                問題を作成します
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isGenerating ? (
        <div className="fileUploader">
          <button className="back-button" onClick={() => setMode("select")}>
            ← 戻る
          </button>
          <div className="generatorContainer">
            {/* 左カラム: プレビュー・ファイル選択 */}
            <div className="leftColumn">
              {/* プレビュー表示エリア */}
              <div className="previewContainer">
                {imageUrl ? (
                  <div>
                    {/* 複数画像をマッピング表示 */}
                    {imageUrl.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`画像プレビュー${index}`}
                        className="imagePreview"
                      />
                    ))}
                  </div>
                ) : pdfUrl ? (
                  <div>
                    {/* 複数PDFをマッピング表示 */}
                    {pdfUrl.map((url, index) => (
                      <iframe
                        key={index}
                        src={url}
                        title={`PDFプレビュー${index}`}
                        className="pdfPreview"
                      ></iframe>
                    ))}
                  </div>
                ) : (
                  <p className="noPreviewText">
                    ファイルをアップロードするとここにプレビューが表示されます
                  </p>
                )}
              </div>

              {/* 画像選択ボタン */}
              <button className="uploadButton" onClick={() => imageInputRef.current.click()}>
                <FaImages size={25} />
                <span>画像を添付</span>
              </button>
              {/* 実際のファイル選択input（非表示） 複数ファイル対応 */}
              <input
                type="file"
                accept="image/*"
                multiple
                ref={imageInputRef}
                onChange={handleImageChange}
                className="hiddenInput"
              />

              {/* PDF選択ボタン */}
              <button
                className={
                  !selectedFiles || selectedFiles.length === 0 ? "notUploadButton" : "uploadButton"
                }
                onClick={() => pdfInputRef.current.click()}
              >
                <FaFilePdf size={25} />
                <span>PDFを添付</span>
              </button>
              {/* 実際のPDFファイル選択input（非表示） 複数ファイル対応 */}
              <input
                type="file"
                accept="application/pdf"
                multiple
                ref={pdfInputRef}
                onChange={handlePdfChange}
                className="hiddenInput"
              />
            </div>

            {/* 右カラム: プロンプト入力・問題数・フォーマット選択・生成ボタン */}
            <div className="rightColumn">
              <h3 className="sectionTitle">問題生成オプション</h3>

              {/* プロンプト入力 */}
              <div className="promptSection">
                <label htmlFor="promptInput" className="promptLabel">
                  自由プロンプト入力（任意）
                </label>
                <textarea
                  id="promptInput"
                  className="promptBox"
                  placeholder="例: 過去問の特徴とか入れてもいいかもね"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  maxLength={20000}
                />
                <span className="charCount">{prompt.length}/20000</span>
              </div>

              {/* 問題数選択 */}
              <div className="questionCountSection">
                <label htmlFor="questionCountSelect" className="questionCountLabel">
                  生成する問題数
                </label>
                <select
                  id="questionCountSelect"
                  className="questionCountSelect"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                >
                  <option key={0} value={0}>
                    指定しない
                  </option>
                  {[5, 10, 15, 20, 25, 30, 35, 40].map((num) => (
                    <option key={num} value={num}>
                      {num}問
                    </option>
                  ))}
                </select>
              </div>

              {/* 問題形式選択 */}
              <div className="formatSection">
                <h4 className="formatTitle">利用可能な問題形式（複数選択可）</h4>
                <div className="formatList">
                  {availableFormats.map((format) => (
                    <div
                      key={format.value}
                      className={`formatCard ${selectedFormats.includes(format.value) ? "selected" : ""
                        }`}
                      onClick={() => handleFormatToggle(format.value)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFormats.includes(format.value)}
                        onChange={() => handleFormatToggle(format.value)}
                        className="formatCheckbox"
                      />
                      <div className="formatInfo">
                        <span className="formatLabel">{format.label}</span>
                        <span className="formatDescription">{format.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="formatHint">選択しない場合はすべての形式から自動で選ばれます</p>
                <p className="generatePrompt">下のボタンを押して問題を生成！</p>
              </div>

              {/* 生成ボタン */}
              <button className="generateButton" onClick={handleGenerateQuestions}>
                <RiAiGenerate size={25} />
                <span>問題を生成！</span>
              </button>

              <p className="usageNote">
                ※ ファイルとプロンプトを両方入力した場合、ファイルをもとに問題が生成されます。
              </p>
            </div>
          </div>

          <Menu />
        </div>
      ) : (
        <div>
          {/* ロード中の時の処理 or 完了時の処理 */}
          {loading ? (
            <p className="questionMaking">
              <div className="loader"></div>
              <span className="message_1">問題を生成中</span>
              <LoadingDot />
              <br />
              <span className="message_2">もう少しお待ちください</span>
            </p>
          ) : generatedQuizId ? (
            <div className="completion-screen">
              <h2>問題の生成が完了しました！</h2>
              <div className="action-buttons">
                <button onClick={() => navigate(`/edit/${generatedQuizId}`)}>問題を編集する</button>
                <button onClick={() => navigate(`/question/${generatedQuizId}`)}>すぐに解く</button>
              </div>
            </div>
          ) : (
            <p>問題の生成に失敗しました</p>
          )}
        </div>
      )}
    </>
  );
}

export default CreateQuestion;
