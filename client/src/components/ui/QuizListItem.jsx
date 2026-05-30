import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsThreeDotsVertical } from "react-icons/bs";
import "./QuizListItem.css";

const QuizListItem = ({ quiz, type, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // IDはrecentがid、myがquestionSetIdを使用
  const quizId = quiz.id || quiz.questionSetId;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEdit = () => {
    navigate(`/edit/${quizId}`);
  };

  const handlePlay = () => {
    navigate(`/question/${quizId}`);
  };

  const handleDelete = () => {
    onDelete(quizId);
  };

  return (
    <div className="quiz-list-item">
      <div className="quiz-info" onClick={handlePlay}>
        <h3 className="quiz-title">{quiz.title}</h3>
      </div>

      <div className="quiz-menu-container" ref={menuRef}>
        <button
          className="menu-trigger"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <BsThreeDotsVertical />
        </button>

        {showMenu && (
          <div className="quiz-menu">
            <button onClick={handlePlay}>開始</button>
            {type === "my" && (
              <>
                <button onClick={handleEdit}>編集</button>
                <button onClick={handleDelete} style={{ color: "red" }}>
                  削除
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizListItem;
