import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useNotification } from "../components/ui/NotificationContext";
import { api } from "../services/api";
import { storageService } from "../services/firebase/storageService";
import { normalizeQuestionData, createNewQuestion, getInitialQuestionProps } from "../utils/quizUtils";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export const useQuizEditor = (quizId) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();

  const [questionSet, setQuestionSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // 削除モーダル用のstate
  // 削除モーダル用のstate (質問本体)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [questionToDeleteIndex, setQuestionToDeleteIndex] = useState(null);

  // 画像削除モーダル用のstate
  const [isImageDeleteModalOpen, setIsImageDeleteModalOpen] = useState(false);
  const [imageToDeleteIndex, setImageToDeleteIndex] = useState(null);

  // タイプ変更確認モーダル用のstate
  const [isTypeChangeModalOpen, setIsTypeChangeModalOpen] = useState(false);
  const [pendingTypeChange, setPendingTypeChange] = useState(null); // { index, newType }

  // ドラッグセンサーの設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // データ取得
  useEffect(() => {
    const fetchQuestionSet = async () => {
      try {
        const data = await api.getQuestionSetJson(quizId);
        const normalized = normalizeQuestionData(data);
        setQuestionSet(normalized);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionSet();
  }, [quizId]);

  // ハンドラ: ドラッグ開始
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // ハンドラ: ドラッグ終了
  const handleDragEnd = (event) => {
    setIsDragging(false);
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over?.id) {
      setQuestionSet((prev) => {
        const oldIndex = prev.questions.findIndex((question) => question.questionId === active.id);
        const newIndex = prev.questions.findIndex((question) => question.questionId === over.id);

        const newQuestions = arrayMove(prev.questions, oldIndex, newIndex);

        // 選択中の問題のインデックスも更新
        if (selectedQuestionIndex === oldIndex) {
          setSelectedQuestionIndex(newIndex);
        } else if (selectedQuestionIndex !== null) {
          if (oldIndex < selectedQuestionIndex && newIndex >= selectedQuestionIndex) {
            setSelectedQuestionIndex(selectedQuestionIndex - 1);
          } else if (oldIndex > selectedQuestionIndex && newIndex <= selectedQuestionIndex) {
            setSelectedQuestionIndex(selectedQuestionIndex + 1);
          }
        }

        return { ...prev, questions: newQuestions };
      });
    }
  };

  // ハンドラ: メタデータ更新
  const handleMetadataChange = (field, value) => {
    setQuestionSet({ ...questionSet, [field]: value });
  };

  // ハンドラ: 質問更新
  const handleQuestionChange = (index, updatedQuestion) => {
    const newQuestions = [...questionSet.questions];
    newQuestions[index] = updatedQuestion;
    setQuestionSet({ ...questionSet, questions: newQuestions });
  };

  // ハンドラ: 削除モーダルオープン
  const handleDeleteQuestion = (index) => {
    setQuestionToDeleteIndex(index);
    setIsDeleteModalOpen(true);
  };

  // ハンドラ: 削除実行
  const executeDeleteQuestion = async () => {
    if (questionToDeleteIndex === null) return;

    const index = questionToDeleteIndex;
    const questionToDelete = questionSet.questions[index];

    // 画像があれば削除
    if (questionToDelete.imageUrl && currentUser) {
      try {
        await storageService.deleteQuizImage(currentUser.uid, quizId, questionToDelete.questionId);
      } catch (e) {
        console.error("Failed to delete image", e);
      }
    }

    const newQuestions = questionSet.questions.filter((_, i) => i !== index);
    setQuestionSet({ ...questionSet, questions: newQuestions });

    if (selectedQuestionIndex === index) setSelectedQuestionIndex(null);
    else if (selectedQuestionIndex !== null && selectedQuestionIndex > index) setSelectedQuestionIndex(selectedQuestionIndex - 1);

    showNotification("問題を削除しました", "success");
    setIsDeleteModalOpen(false);
    setQuestionToDeleteIndex(null);
  };

  // ハンドラ: 画像削除モーダルオープン
  const handleRequestDeleteImage = (index) => {
    setImageToDeleteIndex(index);
    setIsImageDeleteModalOpen(true);
  };

  // ハンドラ: 画像削除実行
  const executeDeleteImage = async () => {
    if (imageToDeleteIndex === null) return;

    const index = imageToDeleteIndex;
    const question = questionSet.questions[index];

    if (!question.imageUrl) {
      setIsImageDeleteModalOpen(false);
      setImageToDeleteIndex(null);
      return;
    }

    try {
      await storageService.deleteQuizImage(currentUser.uid, quizId, question.questionId);

      // State更新: 画像URLを空にする
      const newQuestions = [...questionSet.questions];
      newQuestions[index] = { ...newQuestions[index], imageUrl: "" };
      setQuestionSet({ ...questionSet, questions: newQuestions });

      showNotification("画像を削除しました", "success");
    } catch (e) {
      console.error("Failed to delete image", e);
      showNotification("画像の削除に失敗しました", "error");
    } finally {
      setIsImageDeleteModalOpen(false);
      setImageToDeleteIndex(null);
    }
  };

  // ハンドラ: 複製
  const handleDuplicateQuestion = (index) => {
    const questionToDuplicate = questionSet.questions[index];
    const duplicatedQuestion = {
      ...JSON.parse(JSON.stringify(questionToDuplicate)),
      questionId: crypto.randomUUID(),
      imageUrl: "",
    };
    const newQuestions = [...questionSet.questions];
    newQuestions.splice(index + 1, 0, duplicatedQuestion);
    setQuestionSet({ ...questionSet, questions: newQuestions });
    setSelectedQuestionIndex(index + 1);
  };

  // ハンドラ: 末尾に追加
  const handleAddQuestion = () => {
    const newQuestion = createNewQuestion();
    setQuestionSet((prev) => {
      const newQuestions = [...prev.questions, newQuestion];
      setSelectedQuestionIndex(newQuestions.length - 1);
      return { ...prev, questions: newQuestions };
    });
  };

  // ハンドラ: 指定位置に挿入
  const handleInsertQuestion = (index) => {
    const newQuestion = createNewQuestion();
    setQuestionSet((prev) => {
      const newQuestions = [...prev.questions];
      newQuestions.splice(index + 1, 0, newQuestion);
      setSelectedQuestionIndex(index + 1);
      return { ...prev, questions: newQuestions };
    });
  };


  // ハンドラ: タイプ変更リクエスト
  const handleRequestTypeChange = (index, newType) => {
    const question = questionSet.questions[index];

    // 変更前の入力有無を判定（初期値・空文字は無入力扱い）
    const isInitialQuestion = question.question === "" || question.question === "新しい問題";
    const hasContent =
      (!isInitialQuestion && question.question) ||
      (question.options && question.options.length > 0 && question.options[0] !== "選択肢1") ||
      (question.correctAnswer &&
        question.correctAnswer !== "選択肢1" &&
        question.correctAnswer !== true) ||
      question.explanation;

    // タイプが同じ、またはコンテンツがない場合は即座に変更
    if (question.questionType === newType || !hasContent) {
      executeTypeChange(index, newType);
    } else {
      // 確認モーダルを表示
      setPendingTypeChange({ index, newType });
      setIsTypeChangeModalOpen(true);
    }
  };

  // ハンドラ: タイプ変更実行
  const executeTypeChange = (index = null, newType = null) => {
    // 引数が省略された場合はStateから取得（モーダル経由）
    const targetIndex = index !== null ? index : pendingTypeChange?.index;
    const targetType = newType !== null ? newType : pendingTypeChange?.newType;

    if (targetIndex === null || !targetType) return;

    const currentQuestion = questionSet.questions[targetIndex];
    const updatedQuestion = getInitialQuestionProps(targetType, currentQuestion);

    const newQuestions = [...questionSet.questions];
    newQuestions[targetIndex] = updatedQuestion;
    setQuestionSet({ ...questionSet, questions: newQuestions });

    // クリーンアップ
    setIsTypeChangeModalOpen(false);
    setPendingTypeChange(null);
  };

  // ハンドラ: 保存
  const handleSave = async () => {
    setSaving(true);
    try {
      if (!currentUser) throw new Error("認証されていません");

      // questionIdが欠けている設問にUUIDを付与
      const questionsWithIds = questionSet.questions.map((question) => ({
        ...question,
        questionId: question.questionId || crypto.randomUUID(),
      }));

      const token = await currentUser.getIdToken();

      await api.updateQuestionSet(token, {
        questionSetId: quizId,
        title: questionSet.title,
        questions: questionsWithIds,
        subjectName: questionSet.subjectName,
      });

      setQuestionSet((prev) => ({ ...prev, questions: questionsWithIds }));
      showNotification("クイズを更新しました！", "success");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      showNotification(`エラー: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return {
    // State (状態)
    questionSet,
    loading,
    error,
    saving,
    selectedQuestionIndex,
    isDragging,
    isDeleteModalOpen,
    isImageDeleteModalOpen,
    isTypeChangeModalOpen,

    // Setters (状態更新関数 - 必要に応じて)
    setSelectedQuestionIndex,
    setIsDeleteModalOpen,
    setIsImageDeleteModalOpen,
    setIsTypeChangeModalOpen,

    // Dnd (ドラッグ＆ドロップ関連)
    sensors,
    handleDragStart,
    handleDragEnd,

    // Handlers (操作ハンドラ)
    handleMetadataChange,
    handleQuestionChange,
    handleDeleteQuestion,
    executeDeleteQuestion,
    handleRequestDeleteImage,
    executeDeleteImage,
    handleRequestTypeChange,
    executeTypeChange,
    handleDuplicateQuestion,
    handleAddQuestion,
    handleInsertQuestion,
    handleSave,

    // Auth context (認証情報 - UI表示用)
    currentUser,
  };
};
