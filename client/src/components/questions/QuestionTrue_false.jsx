// 〇×問題用のコンポーネント
import React from "react";
import "./QuestionTrue_false.css";
import { MdDelete } from "react-icons/md";
import LatexRenderer from "../ui/LatexRenderer";

function QuestionTrue_false({ index, question, onAnswer, answer }) {
  // question.jsのhandleAnswerに問題番号と選択内容を送信
  const handleAnswer = (value) => {
    const result = value === "〇"; // 選択が〇の時はtrue, ×の時はfalse
    onAnswer(index, result); // 親に送信
  };

  // 選択をリセットする処理
  const handleClear = () => {
    onAnswer(index, null); // 親に通知
  };

  return (
    <div className="TrueFalse">
      {/* 問題番号と問題を表示 */}
      <h3 className="TrueFalseQuestion">
        <div className="TrueFalseQuestionNumber">
          <span>問題{index + 1}</span>
          <button onClick={handleClear} className="ResetTrueFalse">
            <MdDelete size={20} />
          </button>
        </div>
        <div className="TrueFalseQuestionText">
          <LatexRenderer text={question.question} />
        </div>
      </h3>
      {question.imageUrl && (
        <div
          className="question-image-container"
          style={{ textAlign: "center", marginBottom: "15px" }}
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
      <div className="formExplain">正しいと思う方を選択してください</div>
      {/* 〇と✖のボタン */}
      <div className="TrueFalseButton">
        <button
          onClick={() => handleAnswer("〇")}
          className={answer === true ? "TrueFalseSelectedButton" : "trueButton"}
        >
          <span>〇</span>
        </button>
        <button
          onClick={() => handleAnswer("×")}
          className={answer === false ? "TrueFalseSelectedButton" : "falseButton"}
        >
          <span>×</span>
        </button>
      </div>
    </div>
  );
}

export default QuestionTrue_false;
