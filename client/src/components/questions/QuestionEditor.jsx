import React, { useState, useEffect, useRef } from "react";
import TextareaAutosize from "react-textarea-autosize";
import LatexRenderer from "../ui/LatexRenderer";
import { MdCheck, MdClose } from "react-icons/md";
import { storageService } from "../../services/firebase/storageService";
import QuestionFillInTheBlank from "./QuestionFill_in_the_blank";
import QuestionTypeSelector from "./QuestionTypeSelector";
import QuestionImageUploader from "./QuestionImageUploader";
import { useNotification } from "../ui/NotificationContext";
import ErrorBoundary from "../ui/ErrorBoundary";
import "./QuestionEditor.css";
import {
  CALCULATION_VARIABLE_REGEX,
  extractAnswersFromText
} from "../../utils/quizUtils";
import OptionsEditor from "./parts/OptionsEditor";
import OrderingEditor from "./parts/OrderingEditor";
import TrueFalseEditor from "./parts/TrueFalseEditor";
import CalculationEditor from "./parts/CalculationEditor";

/**
 * 問題作成・編集コンポーネント (QuestionEditor)
 *
 * @param {Object} props
 * @param {Object} props.question - 編集対象の問題データ
 * @param {number} props.index - 問題のインデックス (0-indexed)
 * @param {Function} props.onChange - 問題データ更新時のコールバック (index, newQuestion) => void
 * @param {Function} props.onDelete - 削除ボタン押下時のコールバック
 * @param {Function} props.onDeleteImage - 画像削除時のコールバック
 * @param {Function} props.onTypeChange - 問題タイプ変更時のコールバック
 * @param {Function} props.onDuplicate - 複製時のコールバック
 * @param {boolean} [props.isDraggingGlobal] - ドラッグ中フラグ
 * @param {string} props.userId - ユーザーID (画像アップロード用)
 * @param {string} props.quizId - クイズID (画像アップロード用)
 */
const QuestionEditor = ({
  question,
  index,
  onChange,
  onDelete,
  onDeleteImage,
  onTypeChange,
  onDuplicate,
  isDraggingGlobal = false,
  userId,
  quizId,
}) => {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState("edit"); // 編集タブかプレビュータブかを保持
  const [isUploading, setIsUploading] = useState(false);


  // 並び替え問題の正解順は OrderingEditor 側で correctAnswer 文字列からパースして使用するため、
  // ここでの state 管理は不要になりました。

  const handleChange = (field, value) => {
    onChange(index, { ...question, [field]: value });
  };

  const handleTypeChange = (newType) => {
    if (onTypeChange) {
      onTypeChange(newType);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!userId || !quizId) {
      showNotification("画像をアップロードするには、まずクイズを保存してください。(IDがありません)", "error");
      return;
    }

    setIsUploading(true);
    try {
      const downloadURL = await storageService.uploadQuizImage(
        file,
        userId,
        quizId,
        question.questionId
      );
      handleChange("imageUrl", downloadURL);
    } catch (error) {
      console.error("Image upload failed", error);
      showNotification("画像をアップロードに失敗しました。", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = () => {
    if (onDeleteImage) {
      onDeleteImage();
    }
  };

  // 計算問題: 問題文の変数と変数リストを同期
  useEffect(() => {
    if (question.questionType !== "calculation") return;

    const text = Array.isArray(question.question)
      ? question.question.join(" ")
      : question.question || "";
    const regex = new RegExp(CALCULATION_VARIABLE_REGEX);
    const foundVars = new Set();
    let match;
    // 正規表現のlastIndexをリセット
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      foundVars.add(match[1]);
    }

    const currentVars = question.variables || [];
    const currentVarNames = new Set(currentVars.map((v) => v.name));

    let hasChanges = false;
    let newVars = [...currentVars];

    // 問題文にない変数を除去
    const filteredVars = newVars.filter((v) => foundVars.has(v.name));
    if (filteredVars.length !== newVars.length) {
      newVars = filteredVars;
      hasChanges = true;
    }

    // 新しく見つかった変数を追加
    foundVars.forEach((name) => {
      if (!currentVarNames.has(name)) {
        newVars.push({ name, min: 1, max: 10, step: 1 });
        hasChanges = true;
      }
    });

    if (hasChanges) {
      handleChange("variables", newVars);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.question, question.questionType]);

  const normalizedQuestionText = question.question || "";

  const firstLines = (text, count = 3) => {
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "")
      .slice(0, count)
      .join("\n");
  };

  const questionExcerpt = firstLines(normalizedQuestionText, 3) || "(内容なし)";

  const questionRef = useRef(null);
  const explanationRef = useRef(null);

  const renderHeader = (
    <div className="editor-card-header">
      <div className="header-title">
        <h3>問題 {index + 1}</h3>
      </div>
      <QuestionTypeSelector
        questionType={question.questionType}
        onChange={handleTypeChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        index={index}
      />
    </div>
  );

  if (isDraggingGlobal) {
    return (
      <div className="question-editor-card compact-card">
        {renderHeader}
        <div className="compact-body">
          <pre className="compact-question">{questionExcerpt}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="question-editor-card">
      {/* カードヘッダ */}
      {renderHeader}

      {/* タブ切替 */}
      <div className="editor-tabs">
        <button
          className={`tab-btn ${activeTab === "edit" ? "active" : ""}`}
          onClick={() => setActiveTab("edit")}
        >
          編集
        </button>
        <button
          className={`tab-btn ${activeTab === "preview" ? "active" : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          プレビュー
        </button>
      </div>

      {/* 編集/プレビューエリア */}
      <div className="editor-content">
        {activeTab === "edit" ? (
          <>
            {/*
              === 編集タブ ===
              各質問タイプの入力フォームを表示
             */}
            <div className="form-group">
              <label>問題文</label>
              {question.questionType === "fill_in_the_blank" && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#666",
                    marginBottom: "8px",
                    padding: "8px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "4px",
                  }}
                >
                  穴埋め問題では、空欄と答えを{" "}
                  <code>
                    {"[["}:答え:{"]]"}
                  </code>{" "}
                  の形式で記述してください。（:←半角で入力してね）
                  <br />
                  例: "Pythonは{"[["}:インタープリタ型:{"]]"}言語です。"
                </div>
              )}
              {question.questionType === "calculation" && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#666",
                    marginBottom: "8px",
                    padding: "8px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "4px",
                  }}
                >
                  計算問題では、変数を <code>{"{{var:変数名}}"}</code> の形式で記述してください。
                  <br />
                  例: "{"{{var:a}}"} + {"{{var:b}}"} = ?"
                </div>
              )}
              <TextareaAutosize
                minRows={3}
                maxRows={12}
                ref={questionRef}
                className="form-textarea"
                value={question.question}
                onChange={(e) => {
                  const newQuestionText = e.target.value;
                  const updatedQuestion = { ...question, question: newQuestionText };
                  if (question.questionType === "fill_in_the_blank") {
                    const matches = extractAnswersFromText(newQuestionText);
                    updatedQuestion.correctAnswer = matches.join(", ");
                  }
                  onChange(index, updatedQuestion);
                }}
                placeholder="問題文を入力してください..."
              />
            </div>

            {/* 画像アップロード */}
            <QuestionImageUploader
              imageUrl={question.imageUrl}
              onUpload={handleImageUpload}
              onDelete={handleDeleteImage}
              isUploading={isUploading}
            />

            {/*
              サブエディタの切り替え表示 (編集モード)
              readOnly={false} を渡すことで編集可能にする
             */}
            <ErrorBoundary>
              {(question.questionType === "single_choice" ||
                question.questionType === "multiple_choice") && (
                  <OptionsEditor
                    questionType={question.questionType}
                    options={question.options}
                    answer={question.answer}
                    correctAnswer={question.correctAnswer}
                    onChange={(updates) => onChange(index, { ...question, ...updates })}
                    readOnly={false}
                  />
                )}

              {question.questionType === "ordering" && (
                <OrderingEditor
                  options={question.options}
                  correctAnswer={question.correctAnswer}
                  onChange={(updates) => onChange(index, { ...question, ...updates })}
                  readOnly={false}
                />
              )}

              {question.questionType === "true_false" && (
                <TrueFalseEditor
                  answer={question.answer}
                  onChange={(updates) => onChange(index, { ...question, ...updates })}
                  readOnly={false}
                />
              )}

              {question.questionType === "calculation" && (
                <CalculationEditor
                  formula={question.formula}
                  variables={question.variables}
                  onChange={(updates) => onChange(index, { ...question, ...updates })}
                  readOnly={false}
                />
              )}
            </ErrorBoundary>


            {question.questionType === "free_text_input" && (
              <div className="form-group">
                <label>採点設定</label>
                <div className="grading-settings">
                  <label className="grading-checkbox">
                    <input
                      type="checkbox"
                      checked={question.gradingSettings?.caseSensitive || false}
                      onChange={(e) =>
                        handleChange("gradingSettings", {
                          ...question.gradingSettings,
                          caseSensitive: e.target.checked,
                        })
                      }
                    />
                    大文字・小文字を区別する
                  </label>
                  <label className="grading-checkbox">
                    <input
                      type="checkbox"
                      checked={question.gradingSettings?.useGeminiForGrading || false}
                      onChange={(e) =>
                        handleChange("gradingSettings", {
                          ...question.gradingSettings,
                          useGeminiForGrading: e.target.checked,
                        })
                      }
                    />
                    AI採点を使用する
                  </label>
                </div>
                {question.gradingSettings?.useGeminiForGrading && (
                  <div style={{ marginTop: "10px" }}>
                    <label>採点基準 (AI用)</label>
                    <textarea
                      className="form-textarea"
                      value={question.gradingSettings?.gradingCriteria || ""}
                      onChange={(e) =>
                        handleChange("gradingSettings", {
                          ...question.gradingSettings,
                          gradingCriteria: e.target.value,
                        })
                      }
                      rows={2}
                      placeholder="例: 文法の間違いは許容する、キーワード「〇〇」が含まれていれば正解とする、など"
                    />
                  </div>
                )}
              </div>
            )}

            {question.questionType !== "single_choice" &&
              question.questionType !== "multiple_choice" &&
              question.questionType !== "ordering" &&
              question.questionType !== "true_false" &&
              question.questionType !== "calculation" && (
                <div className="form-group">
                  <label>
                    正解{question.questionType === "fill_in_the_blank" && " (自動抽出)"}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={question.correctAnswer}
                    onChange={(e) => handleChange("correctAnswer", e.target.value)}
                    placeholder="正解を入力してください"
                    readOnly={question.questionType === "fill_in_the_blank"}
                    style={
                      question.questionType === "fill_in_the_blank"
                        ? {
                          backgroundColor: "#f5f5f5",
                          cursor: "not-allowed",
                          color: "#666",
                        }
                        : {}
                    }
                  />
                </div>
              )}

            <div className="form-group">
              <label>解説</label>
              <TextareaAutosize
                minRows={3}
                maxRows={12}
                ref={explanationRef}
                className="form-textarea"
                value={question.explanation}
                onChange={(e) => handleChange("explanation", e.target.value)}
              />
            </div>
          </>
        ) : (
          /*
            === プレビュータブ ===
            Editorコンポーネントを再利用し、readOnly={true} で表示専用モードとして描画する。
            これにより、編集画面とプレビュー画面のデザイン乖離（ViewのDRY違反）を防ぐ。
           */
          <div className="preview-container">
            <ErrorBoundary>
              {question.questionType === "fill_in_the_blank" ? (
                /* 穴埋め問題は独自のプレビュー表示ロジックを持つ既存コンポーネントを使用 */
                <QuestionFillInTheBlank
                  index={index}
                  question={question}
                  answer={[]}
                  onAnswer={() => { }}
                  disableInput={true}
                />
              ) : (
                <div className="preview-question">
                  <LatexRenderer text={question.question} />
                  {question.imageUrl && (
                    <img
                      src={question.imageUrl}
                      alt="Question"
                      className="preview-image"
                      style={{ marginTop: "1rem" }}
                    />
                  )}
                </div>
              )}
            </ErrorBoundary>

            {/* 選択肢などのサブコンポーネントをPreviewモード(readOnly)で表示 */}
            <ErrorBoundary>
              {(question.questionType === "single_choice" ||
                question.questionType === "multiple_choice") && (
                  <OptionsEditor
                    questionType={question.questionType}
                    options={question.options}
                    answer={question.answer}
                    correctAnswer={question.correctAnswer}
                    onChange={() => { }} // No-op
                    readOnly={true}
                  />
                )}

              {question.questionType === "ordering" && (
                <OrderingEditor
                  options={question.options}
                  correctAnswer={question.correctAnswer}
                  onChange={() => { }} // No-op
                  readOnly={true}
                />
              )}

              {question.questionType === "true_false" && (
                <TrueFalseEditor
                  answer={question.answer}
                  onChange={() => { }}
                  readOnly={true}
                />
              )}

              {question.questionType === "calculation" && (
                <CalculationEditor
                  formula={question.formula}
                  variables={question.variables}
                  onChange={() => { }}
                  readOnly={true}
                />
              )}

              {question.explanation && (
                <div
                  className="preview-explanation"
                  style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "0.5rem" }}
                >
                  <strong>解説:</strong> <LatexRenderer text={question.explanation} />
                </div>
              )}
            </ErrorBoundary>
          </div>
        )}
      </div>
    </div >
  );
};

export default QuestionEditor;
