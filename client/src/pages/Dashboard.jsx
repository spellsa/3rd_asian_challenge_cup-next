import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase/firebase";
import { useAuth } from "../hooks/useAuth";
import { useNotification } from "../components/ui/NotificationContext";
import AppButton from "../components/ui/AppButton";
import Menu from "../components/layout/Menu";
import { api } from "../services/api";
import "./Dashboard.css";

import ConfirmModal from "../components/ui/ConfirmModal";

function Dashboard() {
  const { currentUser, loading } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  // 閲覧履歴のstate
  const [recentQuiz, setRecentQuiz] = useState([]);
  // 自分のクイズのstate
  const [myQuiz, setMyQuiz] = useState([]);

  // 削除モーダル用state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      navigate("/");
      return;
    }

    // 問題の閲覧履歴を取得
    const getQuestionLog = async (user) => {
      try {
        const token = await user.getIdToken(); // アクセストークンの取得
        const data = await api.getRecentlyAnsweredQuestionSets(token);
        return data;
      } catch (err) {
        console.error("getQuestionLog エラー:", err);
        return null; // 失敗したときはnullを返す
      }
    };
    // 自分のクイズを取得
    const getQuestionMyQuiz = async (user) => {
      try {
        const token = await user.getIdToken(); // アクセストークンの取得
        const data = await api.getMyQuestionSets(token);
        return data;
      } catch (err) {
        console.error("getQuestionLog エラー:", err);
        return null; // 失敗したときはnullを返す
      }
    };

    const fetchData = async () => {
      const log = await getQuestionLog(currentUser);
      const my = await getQuestionMyQuiz(currentUser);
      if (log) setRecentQuiz(log);
      if (my) setMyQuiz(my);
    };
    fetchData();
  }, [currentUser, loading, navigate]);

  const confirmDelete = (quizId) => {
    setDeleteTargetId(quizId);
    setIsDeleteModalOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!currentUser || !deleteTargetId) return;
    try {
      const token = await currentUser.getIdToken();
      await api.deleteQuestionSet(token, deleteTargetId);
      // 削除成功後、リストから削除
      setMyQuiz((prev) => prev.filter((question) => question.questionSetId !== deleteTargetId));
      showNotification("問題セットを削除しました。", "success");
    } catch (error) {
      console.error("削除エラー:", error);
      showNotification("削除に失敗しました。", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="all">
      <div className="App">
        <Link to="/" className="titleLink">
          <img src="../AIDY.svg" className="DashboardLogo" alt="AIDY ロゴ" />
        </Link>
        <Link to="/create" className="createLink">
          問題を作る
        </Link>
        <Link to="/mypage">
          {/* userが存在する場合はそのphotoURLを表示,存在しない場合は初期アイコン */}
          <img
            src={currentUser ? currentUser.photoURL : "../初期アイコン.png"}
            className="icon"
            alt={currentUser ? `${currentUser.displayName || "ユーザー"} のアイコン` : "初期アイコン"}
          />
        </Link>
      </div>
      <AppButton recent={recentQuiz} myQuiz={myQuiz} onDelete={confirmDelete} />
      <Menu />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleExecuteDelete}
        title="クイズの削除"
        message="このクイズセットを本当に削除してもよろしいですか？この操作は取り消せません。"
        confirmText="削除する"
      />
    </div>
  );
}
export default Dashboard;
