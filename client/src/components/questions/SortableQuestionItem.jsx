// 並び替え可能な問題カードのラッパー
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MdDragIndicator, MdAddCircleOutline } from "react-icons/md";

const SortableQuestionItem = ({ id, index, children, isSelected, onInsert, isDraggingGlobal }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`question-wrapper ${isSelected ? "selected" : ""} ${
        isDragging ? "dragging" : ""
      } ${isDraggingGlobal ? "compact-mode" : ""}`}
    >
      {/* ドラッグハンドル */}
      <div className="drag-handle" {...attributes} {...listeners}>
        <MdDragIndicator className="drag-handle-icon" size={20} />
      </div>
      {children}
      <button
        type="button"
        className="insert-between-btn"
        onClick={() => onInsert?.(index)}
        title="このカードの下に新しい問題を挿入"
      >
        <MdAddCircleOutline size={22} />
      </button>
    </div>
  );
};

export default SortableQuestionItem;
