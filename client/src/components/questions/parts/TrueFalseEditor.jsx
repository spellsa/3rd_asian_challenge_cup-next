import React from "react";

/**
 * 〇✕問題エディタ
 *
 * シンプルな正解(〇または✕)の選択UIを提供します。
 *
 * @param {Object} props
 * @param {boolean|string} props.answer - 正解 (true/false)
 * @param {Function} props.onChange - 更新時のコールバック (updates) => void
 * @param {boolean} [props.readOnly] - プレビュー用
 */
const TrueFalseEditor = ({
  answer, // boolean
  onChange, // ({ answer, correctAnswer }) => void
  readOnly = false,
}) => {
  const handleToggle = (boolVal) => {
    if (readOnly) return;
    onChange({
      answer: boolVal,
      correctAnswer: boolVal,
    });
  };

  const isSelected = (val) => {
    // answer は文字列の "true"/"false" または boolean の可能性があるため正規化して比較
    const current = answer === "true" || answer === true;
    return current === val;
  };

  return (
    <div className="form-group">
      <label>正解 (〇 / ✕)</label>
      <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
        <button
          className={`tf-btn ${isSelected(true) ? "selected" : ""}`}
          onClick={() => handleToggle(true)}
          disabled={readOnly}
          style={readOnly ? { cursor: "default", opacity: isSelected(true) ? 1 : 0.5 } : {}}
        >
          <span style={{ fontSize: "2rem" }}>〇</span> 正解
        </button>
        <button
          className={`tf-btn ${isSelected(false) ? "selected" : ""}`}
          onClick={() => handleToggle(false)}
          disabled={readOnly}
          style={readOnly ? { cursor: "default", opacity: isSelected(false) ? 1 : 0.5 } : {}}
        >
          <span style={{ fontSize: "2rem" }}>✕</span> 不正解
        </button>
      </div>
    </div>
  );
};

export default TrueFalseEditor;
