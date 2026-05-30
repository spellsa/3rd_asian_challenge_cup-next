// react系のものをインポート
import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNotification } from "../components/ui/NotificationContext";
// css，各種コンポーネントをインポート
import { api } from "../services/api";
import "./Question.css";
import Menu from "../components/layout/Menu";
import QuestionTrueFalse from "../components/questions/QuestionTrue_false";
import QuestionFillInTheBlank from "../components/questions/QuestionFill_in_the_blank";
import QuestionFreeTextInput from "../components/questions/QuestionFree_text_input";
import QuestionSingleChoice from "../components/questions/QuestionSingle_choice";
import QuestionMultipleChoice from "../components/questions/QuestionMultiple_choice";
import QuestionOrdering from "../components/questions/QuestionOrdering";
import QuestionCalculation from "../components/questions/QuestionCalculation";
import { IoMdSend } from "react-icons/io";
import { auth } from "../services/firebase/firebase";

// メモ化された問題コンポーネントラッパー
const MemoizedQuestionItem = memo(({ question, index, answer, onAnswer }) => {
  switch (question.questionType) {
    case "true_false":
      return (
        <QuestionTrueFalse index={index} question={question} answer={answer} onAnswer={onAnswer} />
      );
    case "fill_in_the_blank":
      return (
        <QuestionFillInTheBlank
          index={index}
          question={question}
          answer={answer}
          onAnswer={onAnswer}
        />
      );
    case "free_text_input":
      return (
        <QuestionFreeTextInput
          index={index}
          question={question}
          answer={answer}
          onAnswer={onAnswer}
        />
      );
    case "numeric_input":
      return (
        <QuestionFreeTextInput
          index={index}
          question={question}
          answer={answer}
          onAnswer={onAnswer}
        />
      );
    case "single_choice":
      return (
        <QuestionSingleChoice
          index={index}
          question={question}
          answer={answer}
          onAnswer={onAnswer}
        />
      );
    case "multiple_choice":
      return (
        <QuestionMultipleChoice
          index={index}
          question={question}
          answer={answer}
          onAnswer={onAnswer}
        />
      );
    case "ordering":
      return (
        <QuestionOrdering index={index} question={question} answer={answer} onAnswer={onAnswer} />
      );
    case "calculation":
      return (
        <QuestionCalculation
          index={index}
          question={question}
          answer={answer}
          onAnswer={onAnswer}
        />
      );
    default:
      return (
        <div>
          <span className="unknowQuestion">
            問題形式が不明
            <br />
            問題: {question.question}
          </span>
        </div>
      );
  }
});

function Question() {
  // URLのidを取得
  const { id } = useParams();

  //jsonのquestionsの中身を保存するstate
  const [questions, setQuestions] = useState([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  // 問題の回答を保存するstateの配列
  const [answers, setAnswers] = useState([]);

  // リダイレクト用のメソッドを取得
  const navigate = useNavigate();

  // 表示されたときとidが変わったときに実行する
  useEffect(() => {
    const fetchData = async () => {
      try {
        // idが代入されていないという例外の処理
        if (!id) {
          showNotification("idが見つかりません", "error");
          throw new Error("idが存在していません");
        }

        // idから問題の書いてあるjsonを取得
        const questionsData = await api.getQuestionSetJson(id);

        // questionsにjsonのquestionsの部分を保存
        setQuestions(questionsData.questions);
        // タイトルを保存
        setQuizTitle(questionsData.title || "");
        // 問題数に合わせてanswers配列を初期化
        setAnswers(Array(questionsData.questions.length).fill(null));
      } catch (error) {
        console.error("エラーが発生:", error);
      }
    };

    fetchData(); // jsonの取得を実行
  }, [id]);

  const { currentUser, loading } = useAuth();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (!loading) {
      setAuthChecked(true); // useAuthの読み込みが完了
    }
  }, [loading]);

  // 回答をした時の問題の状態を更新
  const handleAnswer = useCallback((index, value) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  // 回答送信ボタンを押したときの処理
  const handleSubmit = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    navigate(`/answer/${id}`, {
      state: {
        questions: questions,
        answers: answers,
      },
    });
  }, [navigate, id, questions, answers]);

  const handleLoginClick = useCallback(() => {
    if (!id) return;
    const redirectPath = `/question/${id}`;
    navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }, [id, navigate]);

  const hasAIQuestions = useMemo(() => {
    return questions.some(
      (question) =>
        question.questionType === "free_text_input" && question.gradingSettings?.useGeminiForGrading
    );
  }, [questions]);

  return (
    <>
      {/* 問題セットのタイトル */}
      {quizTitle && (
        <div className="quiz-title-header">
          <h1>{quizTitle}</h1>
        </div>
      )}

      {authChecked && hasAIQuestions && !currentUser && (
        <div className="ai-login-banner">
          <div>
            <p>この問題セットにはAI採点を使う設問が含まれています。</p>
            <p>ログインしない場合、該当設問は模範解答との完全一致でのみ正解になります。</p>
          </div>
          <button className="ai-login-button" onClick={handleLoginClick}>
            ログインしてAI採点を利用
          </button>
        </div>
      )}
      {/* 各問題の表示 */}
      <ul className="question-list-container">
        {questions.map((question, index) => (
          <li key={question.questionId || index} className="question-item-container">
            <MemoizedQuestionItem
              question={question}
              index={index}
              answer={answers[index]}
              onAnswer={handleAnswer}
            />
          </li>
        ))}
      </ul>

      {/* 回答送信ボタン */}
      <div className="submitAnswer">
        <button onClick={handleSubmit} className="submitButton">
          <IoMdSend size={20} />
          <span>送信</span>
        </button>
      </div>

      <Menu />
    </>
  );
}

export default Question;
