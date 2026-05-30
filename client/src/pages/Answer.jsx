import React, { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate, useNavigationType } from "react-router-dom";
import "./Answer.css";
import LoadingDot from "../components/ui/LoadingDot";
import Menu from "../components/layout/Menu";
import { auth } from "../services/firebase/firebase";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import AnswerResult from "../components/questions/AnswerResult";
import { evaluateQuestionAnswer } from "../utils/grading";

function Answer() {
  //ユーザーデータ
  const { currentUser } = useAuth();

  // URLからidを取得
  const { id } = useParams();

  // question.jsから渡されたstateを取得
  const location = useLocation();

  // locationのstateから問題と回答のデータを取り出す(データがない場合は空文字)
  const { questions, answers } = location.state || {};

  const navigate = useNavigate();

  const [score, setScore] = useState(0);

  // AI採点済みのfree_text結果
  const [aiGrades, setAiGrades] = useState({});

  // 各問題ごとの評価結果
  const [evaluations, setEvaluations] = useState([]);

  // AIによる採点中かどうかのboolを保存するstate
  const [isGrading, setIsGrading] = useState(false);

  // リロード検知API
  const navType = useNavigationType();

  // バックに回答データを送信済みかのbool
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);

  // レベル関連の情報データ
  const [levelData, setLevelData] = useState(null);

  // リロードの時はquestionに返す
  useEffect(() => {
    if (navType === "POP") {
      navigate(`/question/${id}`);
    }
  }, [navType, navigate, id]);



  // free_text_inputをまとめて採点用に送信
  useEffect(() => {
    // 問題または答えがないときはそのまま返す
    if (!questions || !answers) return;

    // console.log(questions);
    // console.log(answers);

    // 記述の採点メソッド
    const sendGradingRequest = async () => {
      // 記述問題の時に、json形式で送信する連想配列
      const freeTextPayload = questions
        // mapを使って要素をそれぞれ代入していく
        .map((question, index) => {
          if (question.questionType === "free_text_input") {
            const rawAnswer = answers[index];
            const normalizedAnswer =
              typeof rawAnswer === "string"
                ? rawAnswer
                : typeof rawAnswer?.textValue === "string"
                  ? rawAnswer.textValue
                  : "";
            const trimmedAnswer = normalizedAnswer.trim();

            if (!trimmedAnswer) {
              return null;
            }

            const shouldUseAIGemini = Boolean(currentUser) && question.gradingSettings?.useGeminiForGrading;
            if (!shouldUseAIGemini) {
              return null;
            }

            return {
              index: index, // 後でmapで使うためにindexを保持(serverに送信はしない)
              question: question.question, // 問題文
              answer: question.correctAnswer || "", // 模範解答
              explanation: question.explanation, // 問題の説明
              userAnswer: { textValue: normalizedAnswer }, // ユーザーの回答 (バリデーションに合わせてオブジェクト化)
              gradingSettings: {
                useGeminiForGrading: true,
                caseSensitive: question.gradingSettings?.caseSensitive ?? false,
                gradingCriteria: question.gradingSettings?.gradingCriteria || "",
              },
              gradingCriteria: question.gradingSettings?.gradingCriteria || "", // 採点基準 (undefined対策)
            };
          }
          // 形式が記述じゃなかったらnullを返す
          return null;
        })
        .filter(Boolean); // nullの要素を除去(true,falseのみ)

      // 記述問題がなかった時に送信しない
      if (freeTextPayload.length === 0) return;

      // ユーザーがロードされていない場合は処理を中断
      if (!currentUser) return;

      try {
        // 採点中のフラグを立てる
        setIsGrading(true);
        const token = await currentUser.getIdToken();

        // データの送信
        const resultArray = await api.gradeFreeText(
          token,
          freeTextPayload.map(({ index, ...rest }) => rest)
        );

        const result = {}; // 採点結果(index: 結果 と代入する連想配列)
        // forEachで採点結果をresultに代入
        resultArray.forEach((res, idx) => {
          const questionIndex = freeTextPayload[idx].index; // 元の質問のindexを取得(resultArayとfreeTextPayloadの順番は一致しているため)
          result[questionIndex] = res; // indexをキーとして採点結果(res)を代入
        });
        setAiGrades((prev) => ({ ...prev, ...result }));
      } catch (error) {
        console.error("AI採点中にエラーが発生しました", error);
      } finally {
        // 採点終了
        setIsGrading(false);
      }
    };

    // メソッドの実行
    sendGradingRequest();
  }, [questions, answers, currentUser]);

  // 各問題の評価結果を計算
  useEffect(() => {
    if (!questions || !answers) return;
    const nextEvaluations = questions.map((question, index) =>
      evaluateQuestionAnswer({
        question,
        userAnswer: answers[index],
        options: {
          isLoggedIn: Boolean(currentUser),
          aiResult: aiGrades[index],
        },
      })
    );
    setEvaluations(nextEvaluations);
  }, [questions, answers, currentUser, aiGrades]);

  // 点数計算と回答データの送信(レベルの判定も送信)
  useEffect(() => {
    if (!questions || !answers || isGrading) return;
    if (!evaluations || evaluations.length !== questions.length) return;

    let count = 0;

    const answerData = {
      questionSetId: id,
      incorrectQuestionIds: [],
      incorrectAnswerDetails: [],
    };

    const pushIncorrectDetail = (detail) => {
      answerData.incorrectQuestionIds.push(detail.questionId);
      answerData.incorrectAnswerDetails.push(detail);
    };

    questions.forEach((question, index) => {
      const evaluation = evaluations[index];
      const userAnswer = answers[index];

      if (evaluation?.isCorrect) {
        count++;
        return;
      }

      const baseDetail = {
        questionId: question.questionId,
        question: question.question,
        correctAnswer: question.correctAnswer ?? question.answer,
        explanation: question.explanation,
        questionType: question.questionType,
        gradingCriteria: question.gradingSettings?.gradingCriteria ?? null,
      };

      if (userAnswer === undefined) {
        pushIncorrectDetail({ ...baseDetail, userAnswer: null });
        return;
      }

      switch (question.questionType) {
        case "free_text_input": {
          const rawAnswer = userAnswer;
          const userText =
            typeof rawAnswer === "string"
              ? rawAnswer
              : typeof rawAnswer?.textValue === "string"
                ? rawAnswer.textValue
                : "";
          pushIncorrectDetail({ ...baseDetail, userAnswer: userText });
          break;
        }
        case "calculation": {
          const ansObj = userAnswer || {};
          pushIncorrectDetail({
            ...baseDetail,
            question: ansObj.generatedQuestion || question.question,
            userAnswer: ansObj.userAnswer ?? null,
            correctAnswer: ansObj.calculatedAnswer ?? question.correctAnswer ?? question.answer,
            gradingCriteria: null,
          });
          break;
        }
        case "numeric_input": {
          pushIncorrectDetail({ ...baseDetail, userAnswer });
          break;
        }
        default: {
          pushIncorrectDetail({ ...baseDetail, userAnswer });
          break;
        }
      }
    });

    const sendAnswerData = async () => {
      try {
        // データの送信
        if (!isGrading && !hasSubmittedAnswer && currentUser) {
          // userトークン
          const token = await currentUser.getIdToken();
          const sendAnswerData = await api.saveUserAnswerLogs(token, answerData);
        }
      } catch (err) {
        console.error("getQuestionLog エラー:", err);
      }
    };
    // 点数を送信してレベルの変更をバックに要請
    const sendScoreData = async (score) => {
      try {
        // データの送信
        if (!isGrading && !hasSubmittedAnswer && currentUser) {
          // userトークン
          const token = await currentUser.getIdToken();
          // 送信データ
          const sendScore = {
            correctAnswersCount: score,
          };
          // 点数のデータを送信
          const sendLevelData = await api.giveExperience(token, sendScore);
          setLevelData(sendLevelData);
          setHasSubmittedAnswer(true);
        }
      } catch (err) {
        console.error("Score送信エラー:", err);
      }
    };
    sendAnswerData();
    setScore(count);
    sendScoreData(count);
  }, [questions, answers, evaluations, id, isGrading, hasSubmittedAnswer, currentUser]);

  // 選択したページの戻る処理
  const navigateTo = (link) => {
    // navigateで戻る
    navigate(link);
  };

  // ページを戻るボタンのコンポーネント
  const BackPageButtons = () => {
    return (
      <div className="backPageButtons">
        <button onClick={() => navigateTo("/dashboard")} className="backTop">
          <span>ホームに戻る</span>
        </button>
        {id && (
          <button onClick={() => navigateTo(`/question/${id}`)} className="backQuestion">
            <span>もう一度解く</span>
          </button>
        )}
      </div>
    );
  };

  // idがない or stateが空の時の処理
  if (!id || !location.state) {
    return (
      <div className="notFoundAPI">
        <h2 className="notFoundError">
          <span>エラー：回答が見つかりません</span>
        </h2>
        <p className="notFoundExplanation">
          このページは問題に回答してからアクセスする必要があります。
        </p>
        <BackPageButtons />
      </div>
    );
  }

  return (
    <div className="answer">
      <Menu />
      <h2 className="answerTitle">
        <span>
          回答結果 点数:{score}/{questions.length}
        </span>
      </h2>
      {levelData && (
        <div className="answerLevel">
          <h2 className="answerCurrentLevel">
            <span>現在のレベル:{levelData.currentLevel}</span>
          </h2>
          <h3 className="answerToNextLevel">
            <span>次のレベルまでの経験値:{levelData.xpToNextLevel}</span>
          </h3>
        </div>
      )}
      {isGrading && (
        <h3 className="gradingMessage">
          <span>記述問題採点中</span>
          <LoadingDot />
        </h3>
      )}
      <div className="questionDescription">
        {questions.map((question, index) => (
          <AnswerResult key={index} question={question} index={index} answers={answers} evaluation={evaluations[index]} />
        ))}
      </div>
      {/* ページを戻るボタン */}
      <BackPageButtons />
    </div>
  );
}
export default Answer;
