import React, { useState, useEffect, useRef } from "react";
import LatexRenderer from "../ui/LatexRenderer";
import { MdRefresh } from "react-icons/md";
import "./QuestionOrdering.css";

const QuestionOrdering = ({ index, question, answer, onAnswer }) => {
  const { question: questionText, options } = question;
  const [availableOptions, setAvailableOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    // 選択肢に一意IDを付与して初期化し、初回のみシャッフル
    if (availableOptions.length === 0 && selectedOptions.length === 0) {
      const initialOptions = options.map((opt, idx) => ({
        id: `opt-${idx}`,
        text: opt,
      }));
      // Fisher-Yatesシャッフルアルゴリズム
      const shuffled = [...initialOptions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setAvailableOptions(shuffled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  useEffect(() => {
    // 初回マウントでは親への更新をスキップ
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    const currentAnswer = selectedOptions.map((o) => o.text).join(" ");
    onAnswer(index, currentAnswer);
    // onAnswerは依存配列に含めない（参照変更ごとの再実行を防ぐ）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, index]);

  const handleOptionClick = (option) => {
    setAvailableOptions((prev) => prev.filter((o) => o.id !== option.id));
    setSelectedOptions((prev) => [...prev, option]);
  };

  const handleSelectedClick = (option) => {
    setSelectedOptions((prev) => prev.filter((o) => o.id !== option.id));
    setAvailableOptions((prev) => [...prev, option]);
  };

  const handleReset = () => {
    const initialOptions = options.map((opt, idx) => ({
      id: `opt-${idx}`,
      text: opt,
    }));
    // リセット時も再シャッフル
    const shuffled = [...initialOptions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setAvailableOptions(shuffled);
    setSelectedOptions([]);
  };

  return (
    <div className="ordering-container">
      <h3 className="ordering-question-header">
        <div className="ordering-question-number">
          <span>問題{index + 1}</span>
          <button onClick={handleReset} className="ordering-reset-btn" title="リセット">
            <MdRefresh size={16} />
          </button>
        </div>
        <div className="ordering-question-text">
          <LatexRenderer text={questionText} />
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

      <span className="form-explain">タイルを選んで並び替えてください</span>

      {/* 回答エリア */}
      <div className="answer-area">
        {selectedOptions.length === 0 && (
          <span style={{ color: "#aaa", width: "100%", textAlign: "center" }}>
            ここを選択して回答を作成
          </span>
        )}
        {selectedOptions.map((option) => (
          <button key={option.id} className="tile" onClick={() => handleSelectedClick(option)}>
            <LatexRenderer text={option.text} />
          </button>
        ))}
      </div>

      {/* 選択肢エリア */}
      <div className="options-area">
        {availableOptions.map((option) => (
          <button key={option.id} className="tile" onClick={() => handleOptionClick(option)}>
            <LatexRenderer text={option.text} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuestionOrdering;
