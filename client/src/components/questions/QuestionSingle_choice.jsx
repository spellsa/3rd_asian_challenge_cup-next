// 選択問題(回答1つ)用のコンポーネント
import React, { useState, useEffect } from "react";
import "./QuestionSingle_choice.css";
import { MdDelete } from "react-icons/md";
import LatexRenderer from "../ui/LatexRenderer";

function QuesitonSingle_choice({ index, question, answer, onAnswer }) {
  // 回答の選択値を保持（なければ空文字）
  const [selected, setSelected] = useState(answer || "");

  // 親から更新された回答を反映
  useEffect(() => {
    if (answer !== undefined) setSelected(answer);
  }, [answer]);

  const handleChange = (value) => {
    setSelected(value);
    onAnswer(index, value);
  };

  // 選択をリセット
  const handleClear = () => {
    setSelected(""); // stateに空文字を保存
    onAnswer(index, ""); // 親に通知
  };

  return (
    <div className="SingleChoice">
      <h3 className="SingleChoiceQuestion">
        <div className="SingleChoiceQuestionNumber">
          <span>問題{index + 1}</span>
          <button onClick={handleClear} className="ResetSingleChoice">
            <MdDelete size={20} />
          </button>
        </div>
        <div className="SingleChoiceQuestionText">
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
      <span className="formExplain">正しいものを選んでください</span>
      <div className="SingleChoiceForm">
        {question.options.map((option, i) => (
          <label key={`option-${index}-${i}`} className="SingleChoiceCheckbox">
            <button
              type="button"
              name={`question-${index}`}
              onClick={() => handleChange(option)}
              className={selected === option ? "SelectedSingleChoice" : "notSelectedSingleChoice"}
              aria-pressed={selected === option}
            >
              <LatexRenderer text={option} inline />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}

export default QuesitonSingle_choice;
