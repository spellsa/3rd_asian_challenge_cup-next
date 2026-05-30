import React from "react";
import { MdCheck, MdClose } from "react-icons/md";
// 相対パスの調整: parts/ から上位の ui/LatexRenderer を参照
import LatexRenderer from "../../ui/LatexRenderer";

/**
 * 選択肢エディタ (Single/Multiple Choice)
 *
 * 単一選択および複数選択問題の選択肢リストを編集するためのUIを提供します。
 * 正解データ(`correctAnswer`, `answer`)の同期ロジックも内包しています。
 *
 * @param {Object} props
 * @param {string} props.questionType - "single_choice" | "multiple_choice" | "ordering" (UI再利用時)
 * @param {string[]} props.options - 選択肢の配列
 * @param {string|string[]|boolean[]} props.answer - 正解データ (単一選択=文字列, 複数選択=boolean配列)
 * @param {string} [props.correctAnswer] - 正解文字列 (バックエンド保存用)
 * @param {Function} props.onChange - 更新時のコールバック (updates) => void
 * @param {boolean} [props.readOnly] - プレビュー用 (編集不可)
 */
const OptionsEditor = ({
  questionType,
  options,
  answer,
  correctAnswer,
  onChange, // (updates) => void
  readOnly = false,
}) => {
  const isCorrect = (optionText, index) => {
    if (questionType === "multiple_choice" && Array.isArray(answer)) {
      return !!answer[index];
    }
    if (questionType === "single_choice") {
      return correctAnswer === optionText || answer === optionText;
    }
    return false;
  };

  const handleOptionChange = (optIndex, value) => {
    if (readOnly) return;
    const newOptions = [...(options || [])];

    // 変更前の値を保持しておく（後で正解データの同期に使用するため）
    const oldOptionValue = newOptions[optIndex];
    newOptions[optIndex] = value;

    let updates = { options: newOptions };

    // 単一選択問題の場合:
    // 変更した選択肢が「正解」として設定されていた場合、正解データ（correctAnswer/answer）も新しい値に更新する
    if (
      questionType === "single_choice" &&
      (correctAnswer === oldOptionValue || answer === oldOptionValue)
    ) {
      updates.correctAnswer = value;
      updates.answer = value;
    }

    // 複数選択問題の場合:
    // 選択肢の増減に合わせて、正解フラグ配列（answer）の長さを同期させる
    if (questionType === "multiple_choice") {
      const ansArr = Array.isArray(answer)
        ? [...answer]
        : new Array(newOptions.length).fill(false);

      while (ansArr.length < newOptions.length) ansArr.push(false);
      if (ansArr.length > newOptions.length) ansArr.length = newOptions.length;
      updates.answer = ansArr;

      // 正解文字列更新
      const selected = newOptions.filter((_, idx) => ansArr[idx]);
      updates.correctAnswer = selected.join(" ");
    }

    onChange(updates);
  };

  const toggleCorrectAnswer = (optIndex, optionText) => {
    if (readOnly) return;
    let updates = {};

    if (questionType === "single_choice") {
      updates.correctAnswer = optionText;
      updates.answer = optionText;
    }

    if (questionType === "multiple_choice") {
      const ansArr = Array.isArray(answer)
        ? [...answer]
        : new Array((options || []).length).fill(false);
      ansArr[optIndex] = !ansArr[optIndex];
      updates.answer = ansArr;

      // 正解文字列更新
      const selected = options.filter((_, idx) => ansArr[idx]);
      updates.correctAnswer = selected.join(" ");
    }

    onChange(updates);
  };

  const addOption = () => {
    if (readOnly) return;
    const newOptions = [...(options || []), ""];
    let updates = { options: newOptions };

    if (questionType === "multiple_choice") {
      const ansArr = Array.isArray(answer)
        ? [...answer, false]
        : new Array(newOptions.length).fill(false);
      updates.answer = ansArr;
    }
    onChange(updates);
  };

  const removeOption = (optIndex) => {
    if (readOnly) return;
    const newOptions = (options || []).filter((_, i) => i !== optIndex);
    let updates = { options: newOptions };

    if (questionType === "multiple_choice") {
      const ansArr = Array.isArray(answer) ? [...answer] : [];
      ansArr.splice(optIndex, 1);
      updates.answer = ansArr;

      const selected = newOptions.filter((_, idx) => ansArr[idx]);
      updates.correctAnswer = selected.join(" ");
    }
    onChange(updates);
  };

  // テキストボックスのスタイル (Preview用)
  const inputStyle = readOnly
    ? { backgroundColor: "#f9f9f9", cursor: "default", border: "1px solid transparent" }
    : {};

  return (
    <div className="form-group">
      <label>選択肢 & 正解設定</label>
      <div className="options-list">
        {options &&
          options.map((opt, i) => (
            <div key={i} className="option-row">
              {/* 正解判定ボタン/インジケータ */}
              <button
                className={`correct-answer-toggle ${isCorrect(opt, i) ? "is-correct" : ""}`}
                onClick={() => toggleCorrectAnswer(i, opt)}
                title="正解として設定"
                disabled={readOnly}
                style={readOnly ? { cursor: "default", opacity: isCorrect(opt, i) ? 1 : 0.3 } : {}}
              >
                <MdCheck size={16} />
              </button>

              <div style={{ flex: 1 }}>
                {/*
                  プレビュー時（readOnly=true）は、数式等がレンダリングされた状態（LatexRenderer）を表示する。
                  編集時（readOnly=false）は、ユーザーがテキストを編集できるようにinput要素を表示する。
                */}
                {readOnly ? (
                  <div className="option-input" style={{ ...inputStyle, padding: "8px" }}>
                    <LatexRenderer text={opt || " "} />
                  </div>
                ) : (
                  <input
                    type="text"
                    className="option-input"
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    placeholder={`選択肢 ${i + 1}`}
                  />
                )}
              </div>

              {!readOnly && (
                <button
                  className="btn-remove-option"
                  onClick={() => removeOption(i)}
                  title="選択肢を削除"
                >
                  <MdClose />
                </button>
              )}
            </div>
          ))}
        {!readOnly && (
          <button className="btn-add-option" onClick={addOption}>
            + 選択肢を追加
          </button>
        )}
      </div>
    </div>
  );
};

export default OptionsEditor;
