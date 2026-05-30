// 穴埋め問題用コンポーネント
import React, { useState, useEffect } from "react";
import "./QuestionFill_in_the_blank.css";
import { MdDelete } from "react-icons/md";
import LatexRenderer from "../ui/LatexRenderer";
import { extractAnswersFromText } from "../../utils/quizUtils";

function QuestionFill_in_the_blank({ index, question, answer, onAnswer, disableInput }) {
  // 問題文から空欄数を都度算出
  const { question: questionText } = question;

  const computeBlankCount = () => {
    if (typeof questionText !== "string") return Array.isArray(answer) ? answer.length : 0;

    // quizUtilsの共有ロジックで正解リストを取得し、その個数をカウント
    const matches = extractAnswersFromText(questionText);

    if (matches.length > 0) return matches.length;
    // フォールバック: answer 配列長があればそれを使用
    if (Array.isArray(answer)) return answer.length;
    return 0;
  };

  const blankCount = computeBlankCount();

  // 空欄数に合わせて回答配列を初期化（過去の回答があれば復元）
  const [inputs, setInputs] = useState(
    Array(blankCount)
      .fill("")
      .map((_, i) => answer?.[i] || "")
  );

  // 親から更新された回答を反映
  useEffect(() => {
    const newCount = computeBlankCount();
    const base = Array(newCount).fill("");
    const merged = base.map((_, i) => (answer && Array.isArray(answer) ? answer[i] || "" : ""));
    setInputs(merged);
  }, [answer, questionText]);

  // 入力変更時に回答配列を親へ伝搬
  const handleChange = (i, value) => {
    const updated = [...inputs];
    updated[i] = value;
    setInputs(updated);
    onAnswer(index, updated);
  };

  // 回答をリセット
  const handleClear = () => {
    const cleared = Array(blankCount).fill("");
    setInputs(cleared);
    onAnswer(index, cleared);
  };

  return (
    <div className="FillInTheBlank">
      <h3 className="FillInTheBlankQuestion">
        {/* 問題文と空欄を描画 */}
        <div>
          <span>問題{index + 1}</span>
          <button onClick={handleClear} className="ResetFillInTheBlank">
            <MdDelete size={20} />
          </button>
        </div>

        {/* 新しいLatexRendererを使用し、テキスト分割ロジックを委譲 */}
        <LatexRenderer
          text={questionText}
          inline={false}
          onInputChange={handleChange}
          inputs={inputs}
          disabled={disableInput}
        />

        {question.imageUrl && (
          <div
            className="question-image-container"
            style={{ textAlign: "center", margin: "15px 0" }}
          >
            <img
              src={question.imageUrl}
              alt={`Question ${index + 1}`}
              loading="lazy"
              style={{
                maxWidth: "100%",
                maxHeight: "300px",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          </div>
        )}
        <div className="formExplain">正しい答えを入力してください</div>
      </h3>
    </div>
  );
}

export default QuestionFill_in_the_blank;
