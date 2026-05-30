import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuestionEditor from "../components/questions/QuestionEditor";
import SortableQuestionItem from "../components/questions/SortableQuestionItem";
import { MdArrowBack, MdSave, MdAddCircleOutline } from "react-icons/md";
import "./EditQuiz.css";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import ConfirmModal from "../components/ui/ConfirmModal";
import { useQuizEditor } from "../hooks/useQuizEditor";

const EditQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    questionSet,
    loading,
    error,
    saving,
    selectedQuestionIndex,
    setSelectedQuestionIndex,
    isDragging,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleMetadataChange,
    handleQuestionChange,
    handleDeleteQuestion,
    executeDeleteQuestion,
    handleRequestDeleteImage,
    executeDeleteImage,
    isImageDeleteModalOpen,
    setIsImageDeleteModalOpen,
    handleRequestTypeChange,
    executeTypeChange,
    isTypeChangeModalOpen,
    setIsTypeChangeModalOpen,
    handleDuplicateQuestion,
    handleAddQuestion,
    handleInsertQuestion,
    handleSave,
    currentUser,
  } = useQuizEditor(id);

  if (loading) return <div className="loading-screen">読み込み中...</div>;
  if (error) return <div className="error-screen">エラー: {error}</div>;
  if (!questionSet) return <div>データが見つかりません</div>;

  return (
    <div className="edit-quiz-container">
      {/* 固定ヘッダー */}
      <header className="edit-quiz-header-sticky">
        <div className="header-left">
          <h2>
            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
              title="ダッシュボードに戻る"
            >
              <MdArrowBack size={24} />
            </button>
            クイズの編集
          </h2>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <MdSave size={20} />
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </header>

      {/* メタ情報カード */}
      <div className="quiz-metadata-card">
        <div className="form-group">
          <label>クイズのタイトル</label>
          <input
            type="text"
            className="form-input"
            value={questionSet.title}
            onChange={(e) => handleMetadataChange("title", e.target.value)}
            placeholder="タイトルを入力"
          />
        </div>
      </div>

      {/* Tipsカード（静的表示） */}
      <div className="quiz-metadata-card" style={{ marginTop: "1rem" }}>
        <div className="form-group">
          <label>Tips</label>
          <div
            style={{
              padding: "0.8rem",
              background: "#fafafa",
              borderRadius: "6px",
              color: "#333",
              lineHeight: 1.6,
            }}
          >
            ここではインライン形式のLatexを使って式を綺麗に書くことができます。
            <br />
            例：$E=mc^2$ のように、数式を$で囲んでください。
            <br />
          </div>
        </div>
      </div>

      {/* 質問リスト */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        autoScroll={{
          threshold: { x: 0, y: 0.15 },
          acceleration: 40,
          interval: 10,
        }}
      >
        <SortableContext
          items={questionSet.questions.map((question) => question.questionId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="questions-list">
            {questionSet.questions.map((question, index) => (
              <SortableQuestionItem
                key={question.questionId || index}
                id={question.questionId}
                index={index}
                isSelected={selectedQuestionIndex === index}
                isDraggingGlobal={isDragging}
                onInsert={() => handleInsertQuestion(index)}
              >
                <div
                  onClick={(e) => {
                    setSelectedQuestionIndex(index);
                  }}
                >
                  <QuestionEditor
                    index={index}
                    question={question}
                    onChange={handleQuestionChange}
                    onDelete={handleDeleteQuestion}
                    onDeleteImage={() => handleRequestDeleteImage(index)}
                    onTypeChange={(newType) => handleRequestTypeChange(index, newType)}
                    onDuplicate={handleDuplicateQuestion}
                    isDraggingGlobal={isDragging}
                    userId={currentUser?.uid}
                    quizId={id}
                  />
                </div>
              </SortableQuestionItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 追加ボタン */}
      <div className="add-question-area">
        <button className="btn-add-large" onClick={handleAddQuestion}>
          <MdAddCircleOutline size={24} />
          新しい問題を追加
        </button>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDeleteQuestion}
        title="問題の削除"
        message="この問題を削除してもよろしいですか？"
        confirmText="削除"
      />

      <ConfirmModal
        isOpen={isImageDeleteModalOpen}
        onClose={() => setIsImageDeleteModalOpen(false)}
        onConfirm={executeDeleteImage}
        title="画像の削除"
        message="この画像を削除してもよろしいですか？"
        confirmText="削除"
      />

      <ConfirmModal
        isOpen={isTypeChangeModalOpen}
        onClose={() => setIsTypeChangeModalOpen(false)}
        onConfirm={() => executeTypeChange()}
        title="問題タイプの変更"
        message={`既に入力されているカードの問題タイプを変更すると、一部のセクション（選択肢、正解など）が消える可能性があります。\n本当に変更しますか？`}
        confirmText="変更する"
      />
    </div>
  );
};

export default EditQuiz;
