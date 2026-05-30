// 記述問題用コンポーネント
import React, { useState, useEffect } from "react";
import "./QuestionFree_text_input.css";
import { MdDelete } from "react-icons/md";
import LatexRenderer from "../ui/LatexRenderer";

function QuestionFree_text_input({ index, question, answer, onAnswer }) {
  // 回答の入力値を保持（回答がなければ空文字）
  const [input, setInput] = useState(answer || "");

  // 親から更新された回答を反映
  useEffect(() => {
    setInput(answer ?? "");
  }, [answer]);

  // 入力変更時に親へ回答を伝搬
  const handleChange = (e) => {
    const value = e.target.value;
    setInput(value);
    onAnswer(index, value);
  };

  // 回答をリセット
  const handleClear = () => {
    const cleared = "";
    setInput(cleared);
    onAnswer(index, cleared);
  };

  return (
    <div className="FreeTextInput">
      <h3 className="FreeTextInputQuestion">
        <div className="FreeTextInputQuestionNumber">
          <span>問題{index + 1}</span>
          <button onClick={handleClear} className="ResetFreeTextInput">
            <MdDelete size={20} />
          </button>
        </div>
        <div className="FreeTextInputQuestionText">
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
      <div className="FreeTextInputForm">
        <div className="formExplain">正しい答えを入力してください</div>
        <span>
          回答:
          <input
            type="text"
            className="EnteringFreeTextInput"
            value={input}
            onChange={handleChange}
            placeholder="ここに回答を入力"
          />
        </span>
      </div>
    </div>
  );
}

export default QuestionFree_text_input;
