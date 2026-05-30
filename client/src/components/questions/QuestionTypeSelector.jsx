import React from "react";
import { MdContentCopy, MdDelete } from "react-icons/md";

const QuestionTypeSelector = ({
  questionType,
  onChange,
  onDuplicate,
  onDelete,
  index,
}) => {
  return (
    <div className="header-controls">
      <select
        className="type-select"
        value={questionType}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="single_choice">選択問題 (単一回答)</option>
        <option value="multiple_choice">選択問題 (複数回答)</option>
        <option value="true_false">〇✕問題</option>
        <option value="fill_in_the_blank">穴埋め問題</option>
        <option value="free_text_input">自由記述</option>
        <option value="numeric_input">数値入力 (ランダムなし)</option>
        <option value="ordering">並び替え問題</option>
        <option value="calculation">計算問題</option>
      </select>
      <button
        className="btn-icon-duplicate"
        onClick={() => onDuplicate(index)}
        title="問題を複製"
      >
        <MdContentCopy size={18} />
      </button>
      <button className="btn-icon-danger" onClick={() => onDelete(index)} title="問題を削除">
        <MdDelete size={20} />
      </button>
    </div>
  );
};

export default QuestionTypeSelector;
