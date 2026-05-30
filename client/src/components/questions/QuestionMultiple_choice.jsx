// 選択問題(回答複数)用コンポーネント
import React, { useState, useEffect } from "react";
import "./QuestionMultiple_choice.css";
import { MdDelete } from "react-icons/md";
import LatexRenderer from "../ui/LatexRenderer";

function QuestionMultiple_choice({ index, question, answer, onAnswer }) {
  // 選択肢の個数を代入
  const choiceCount = question.options.length;

  // 回答の真偽配列を保持（未回答なら全てfalse）
  const [selected, setSelected] = useState(answer || Array(choiceCount).fill(false));

  // 親から更新された回答を反映
  useEffect(() => {
    if (answer) setSelected(answer);
  }, [answer]);

  // 入力変更時に回答配列を親へ伝搬
  const handleChange = (i) => {
    const updated = [...selected];
    updated[i] = !updated[i];
    setSelected(updated);
    onAnswer(index, updated);
  };

  // 選択をリセット
  const handleClear = () => {
    const cleared = Array(choiceCount).fill(false); // 選択肢の個数分ある配列(全てfalse)を作成
    setSelected(cleared); // stateに状態を保存(全てfalse)
    onAnswer(index, cleared); // 親に通知
  };

  return (
    <div className="MultipleChoice">
      <h3 className="MultipleChoiceQuestion">
        <div className="MultipleChoiceQuestionNumber">
          <span>問題{index + 1}</span>
          <button onClick={handleClear} className="ResetMultipleChoice">
            <MdDelete size={20} />
          </button>
        </div>
        <div className="MultipleChoiceQuestionText">
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
      <span className="formExplain">正しいものをすべて選んでください</span>
      <div className="MultipleChoiceForm">
        {question.options.map((option, i) => (
          <label key={`multi-${index}-${i}`} className="MultipleChoiceCheckbox">
            <button
              type="button"
              onClick={() => handleChange(i)}
              className={selected[i] ? "selectedButton" : "notSelectedButton"}
              aria-pressed={selected[i]}
            >
              <LatexRenderer text={option} inline />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}

export default QuestionMultiple_choice;
