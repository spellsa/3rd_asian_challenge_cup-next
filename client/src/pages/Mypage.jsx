import React, { useState, useEffect, useRef } from "react";
import { auth } from "../services/firebase/firebase";
import { updateProfile } from "firebase/auth";
import { useAuth } from "../hooks/useAuth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../services/firebase/firebase";
import { useNavigate } from "react-router-dom";
import "./Mypage.css";
import Menu from "../components/layout/Menu";
import { FaPen } from "react-icons/fa";
import { api } from "../services/api";
import QuizListItem from "../components/ui/QuizListItem";

function Mypage() {
  const [currentUser, setCurrentUser] = useState();

  const navigate = useNavigate();

  // レベルを表示するstate
  const [userLevel, setUserLevel] = useState(0);

  // 次のレベルまでの経験値を表示するstate
  const [toNextExp, setToNextExp] = useState(0);

  // input要素への参照(間接的にクリックするため)
  const profileImageInputRef = useRef(null);

  // 変更した名前を保存するstate
  const [editName, setEditName] = useState("");
  // 名前を変更するかどうかのbool
  const [isEditName, setIsEditName] = useState(false);
  // 前回の名前を保存するstate
  const [beforeEditName, setBeforeEditName] = useState("");

  // イメージファイルを保存するstate
  const [imageFile, setImageFile] = useState(null);
  // イメージファイルのURL
  const [imageFileURL, setImageFileURL] = useState(null);

  // 自分のクイズのstate
  const [myQuiz, setMyQuiz] = useState([]);

  const { currentUser: authUser, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!authUser) {
      navigate("/");
      return;
    }

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
    // レベルの取得
    const getUserLevel = async (user) => {
      try {
        const token = await user.getIdToken(); // アクセストークンの取得
        const data = await api.getUserLevel(token);
        return data;
      } catch (err) {
        console.error("レベル取得エラー:", err);
      }
    };

    const initData = async () => {
      setCurrentUser(authUser);
      setEditName(authUser.displayName || ""); // 初期表示用
      const my = await getQuestionMyQuiz(authUser);
      const level = await getUserLevel(authUser);
      if (my) setMyQuiz(my);
      if (level) {
        setUserLevel(level.currentLevel);
        setToNextExp(level.xpToNextLevel);
      }
    };

    initData();
  }, [authUser, loading, navigate]);

  // 名前を変更するモードに移行
  const handleNameMode = () => {
    setBeforeEditName(editName); // 前回の名前を代入
    setIsEditName(true); // 編集モード移行
  };
  // 名前を変更
  const handleNameChange = (e) => {
    setEditName(e.target.value); //入力した内容を代入
  };
  // 名前の変更を確定した時の処理
  const handleNameSubmit = () => {
    if (editName.replace(/\s/g, "") === "") {
      return handleCancelName();
    }
    setIsEditName(false); // 編集終了
  };
  // 名前の変更をキャンセルした時の処理
  const handleCancelName = () => {
    if (currentUser) {
      setEditName(beforeEditName); // 名前を元に戻す
    }
    setIsEditName(false); // 編集終了
  };

  // プロフィール画像の変更
  const handleProfileImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImageFileURL(URL.createObjectURL(file));
    }
  };

  // プロフィールの変更を保存
  const handleChangeProfile = async () => {
    if (!currentUser) return;

    try {
      const updateData = {};

      // 名前の変更があるとき
      if (currentUser.displayName !== editName) {
        updateData.displayName = editName;
      }

      // 画像の変更がある場合
      if (imageFile) {
        // ファイルの保存先パスを定義 (例: "profileImages/ユーザーUID.jpg")
        const filePath = `profileImages/${currentUser.uid}_${Date.now()}`;
        const imageRef = ref(storage, filePath);

        // Storage にアップロード
        await uploadBytes(imageRef, imageFile);

        // アップロード後の画像URLを取得
        const downloadURL = await getDownloadURL(imageRef);

        // プロフィール更新に使う
        updateData.photoURL = downloadURL;
      }

      // Firebase Auth のプロフィール更新
      await updateProfile(currentUser, updateData);

      // 状態更新（最新のuser情報で上書き）
      setCurrentUser({ ...auth.currentUser });

      // 編集モード終了
      setIsEditName(false);
      setImageFile(null);
      setImageFileURL(null);
    } catch (error) {
      console.error("プロフィール更新に失敗しました:", error);
    }
  };

  return (
    <div className="profile">
      <img
        src={
          // 画像の変更を行った場合はその画像に変更する(してない場合はuserから取得した画像)
          imageFileURL ? imageFileURL : currentUser?.photoURL ? currentUser.photoURL : "../初期アイコン.png"
        }
        alt="プロフィール画像"
        className="profileIcon"
        onClick={() => profileImageInputRef.current.click()}
        style={{ cursor: "pointer" }}
      />
      <FaPen className="FaPenIcon" size={40} onClick={() => profileImageInputRef.current.click()} />
      {isEditName ? (
        <div className="nameEditMode">
          <input
            type="text"
            value={editName}
            onChange={handleNameChange}
            autoFocus
            className="nameEditInput"
          />
          <button onClick={handleNameSubmit} className="submitNameButton">
            <span>確定</span>
          </button>
          <button onClick={handleCancelName} className="cancelNameButton">
            <span>キャンセル</span>
          </button>
        </div>
      ) : (
        // userが存在する場合にその名前を表示
        <>
          <div className="userName" onClick={handleNameMode} style={{ cursor: "pointer" }}>
            <span>{currentUser ? editName : "名前を取得しています..."}</span>
            <FaPen className="FaPenName" size={15} color="#aaa" />
          </div>
          {currentUser && (
            /* 変更を保存ボタン
            クラス名を変更されたかどうかで変える
            ユーザーの名前が編集後の名前と違うまたは、変更した画像のURLが存在している場合のみに押せるようにする
             */
            <button
              className={
                currentUser.displayName !== editName || imageFileURL ? "editedChange" : "notEditedChange"
              }
              disabled={!(currentUser.displayName !== editName || imageFileURL)}
              onClick={handleChangeProfile}
            >
              <span>変更を保存</span>
            </button>
          )}
        </>
      )}
      <h2 className="userLevel">
        <span>レベル:{userLevel}</span>
      </h2>
      <h3 className="toNextLevelExp">
        <span>次のレベルまでの経験値:{toNextExp}</span>
      </h3>
      <br />

      <>
        <h2>あなたのクイズ</h2>
        {myQuiz.length === 0 && myQuiz && <h3>クイズがありません</h3>}
        <div className="quiz-list">
          {myQuiz && myQuiz.map((my, i) => <QuizListItem key={i} quiz={my} type="my" />)}
        </div>
      </>
      <Menu />

      {/* 実際のファイル選択input（非表示） 複数ファイル対応 */}
      <input
        type="file"
        accept="image/*"
        ref={profileImageInputRef}
        onChange={handleProfileImage}
        className="hiddenProfileInput"
      />
    </div>
  );
}

export default Mypage;
