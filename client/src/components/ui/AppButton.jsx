import React, { useState } from "react"; // タブ状態を管理
import QuizListItem from "./QuizListItem";

const AppButton = ({ recent, myQuiz, onDelete }) => {
  // 表示するクイズカテゴリを管理
  const [selected, setSelected] = useState("recent");
  const handleRecent = () => setSelected("recent");
  const handleMy = () => setSelected("my");

  return (
    <div>
      <div className="robbyButtons buttonContainer">
        <button
          className={selected === "recent" ? "afterClick" : "recentButton"}
          onClick={handleRecent}
        >
          最近のクイズ
        </button>
        <button className={selected === "my" ? "afterClick" : "myButton"} onClick={handleMy}>
          自分のクイズ
        </button>
      </div>

      <div className="quizContainer">
        {selected === "recent" ? (
          <>
            {recent.length === 0 && <h3>クイズがありません</h3>}
            <div className="quiz-list">
              {recent &&
                recent.map((recent, i) => <QuizListItem key={i} quiz={recent} type="recent" />)}
            </div>
          </>
        ) : selected === "my" ? (
          <>
            {myQuiz.length === 0 && <h3>クイズがありません</h3>}
            <div className="quiz-list">
              {myQuiz &&
                myQuiz.map((my, i) => (
                  <QuizListItem key={i} quiz={my} type="my" onDelete={onDelete} />
                ))}
            </div>
          </>
        ) : (
          <p>クイズが表示できません</p>
        )}
      </div>
    </div>
  );
};

export default AppButton; //AppButton関数をエクスポート
