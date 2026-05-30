// 解答結果の表示と採点結果の描画コンポーネント
import React from "react";
import { UI_TEXT } from "../../config/constants";
import LatexRenderer from "../ui/LatexRenderer";
import { extractFreeTextValue, VERDICT_SOURCE, parseOrderingSequence } from "../../utils/grading";

import { extractAnswersFromText, applyVariables } from "../../utils/quizUtils";

// const VARIABLE_PATTERN = ... (Removed)
// const applyVariablesToText = ... (Removed, using shared version)

const extractScopeFromAnswer = (answerValue) => {
  if (!answerValue || typeof answerValue !== "object") return null;
  if (Array.isArray(answerValue)) return null;
  return answerValue.scope || null;
};

const stringifyAnswer = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized === "string") {
      return serialized.replace(/"/g, "");
    }
  } catch (err) {
    // JSONパースエラーは無視して、そのまま文字列化する
  }
  return String(value);
};

const AnswerResult = ({ question, index, answers, evaluation }) => {
  const userRaw = answers[index] !== undefined ? answers[index] : "";
  const variableScope = extractScopeFromAnswer(answers[index]);
  const explanationText = applyVariables(question.explanation, variableScope);
  const evaluationResult = evaluation || {};
  const isCorrect = evaluationResult.isCorrect ?? false;
  const verdictSource = evaluationResult.verdictSource || VERDICT_SOURCE.MANUAL;
  const aiExplanation = evaluationResult.aiExplanation;
  const showAiLoginHint = verdictSource === VERDICT_SOURCE.MANUAL_FALLBACK;

  // 穴埋め/並び替え/計算は専用処理
  let modelAnswer;
  let userAnswer;
  let extractedModelAnswers = [];
  let orderingUserSequence = [];
  let orderingCorrectSequence = [];

  if (question.questionType === "fill_in_the_blank") {
    // grading.js で抽出済みの答えを優先し、なければ問題文から抽出
    if (
      Array.isArray(evaluationResult.extractedModelAnswers) &&
      evaluationResult.extractedModelAnswers.length > 0
    ) {
      extractedModelAnswers = evaluationResult.extractedModelAnswers;
    } else {
      // 評価結果に無ければ問題文から抽出 (shared logic)
      extractedModelAnswers = extractAnswersFromText(question.question);
    }
    modelAnswer = extractedModelAnswers.join(", ");
    userAnswer = Array.isArray(userRaw) ? userRaw.join(", ") : "";
  } else if (question.questionType === "ordering") {
    orderingUserSequence = Array.isArray(evaluationResult.normalizedUserAnswer)
      ? evaluationResult.normalizedUserAnswer
      : parseOrderingSequence(userRaw);
    orderingCorrectSequence = Array.isArray(evaluationResult.normalizedCorrectAnswer)
      ? evaluationResult.normalizedCorrectAnswer
      : parseOrderingSequence(question.correctAnswer ?? question.answer);

    userAnswer = orderingUserSequence.join(" → ");
    modelAnswer = orderingCorrectSequence.join(" → ");
  } else if (question.questionType === "calculation") {
    const calcData = answers[index] || {};
    userAnswer = calcData.userAnswer !== undefined ? String(calcData.userAnswer) : "";
    modelAnswer =
      calcData.calculatedAnswer !== undefined
        ? String(calcData.calculatedAnswer)
        : stringifyAnswer(question.correctAnswer ?? question.answer);
  } else {
    // その他の問題タイプは従来通り
    userAnswer = stringifyAnswer(userRaw);
    modelAnswer = stringifyAnswer(question.answer ?? question.correctAnswer);
  }

  // isCorrect は evaluationResult 由来

  const renderContent = () => {
    return (
      <>
        {/* 画像がある場合は表示 */}
        {/* 画像がある場合は表示 */}
        {question.imageUrl && (
          <div
            className="answer-image-container"
            style={{ textAlign: "center", marginBottom: "10px" }}
          >
            <img
              src={question.imageUrl}
              alt={`Question ${index + 1}`}
              style={{
                maxWidth: "100%",
                maxHeight: "200px",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          </div>
        )}
        {(() => {
          switch (question.questionType) {
            case "true_false": // 〇✖問題
              // ユーザーの回答を〇✖形式に変換（未選択の場合は「未選択」）
              const formatTrueFalseAnswer = (answer) => {
                if (answer === "" || answer === null || answer === undefined) {
                  return "未選択";
                }
                return answer === "true" ? "〇" : "×";
              };

              const userAnswerTrueFalse = formatTrueFalseAnswer(userAnswer);
              const modelAnswerTrueFalse = modelAnswer === "true" ? "〇" : "×";
              return (
                <div className="trueFalseAnswer">
                  <h3 className="trueFalseStatement">
                    <span>
                      <LatexRenderer text={question.question} />
                    </span>
                  </h3>
                  <h3 className="userAnswerTrueFalse">
                    <span>
                      {UI_TEXT.YOUR_ANSWER}
                      {userAnswerTrueFalse}
                    </span>
                  </h3>
                  <h3 className="modelAnswerTrueFalse">
                    <span>
                      {UI_TEXT.MODEL_ANSWER}
                      {modelAnswerTrueFalse}
                    </span>
                  </h3>
                </div>
              );
            case "fill_in_the_blank": // 穴埋め問題
              const userInputs = Array.isArray(answers[index]) ? answers[index] : [];

              // grading.jsでの採点結果(blankResults)があればそれを優先的に使用し見栄えを統一する
              const blankResults = Array.isArray(evaluationResult.blankResults)
                ? evaluationResult.blankResults
                : extractedModelAnswers.map((ans, idx) => {
                  const userVal = (userInputs[idx] || "").trim();
                  return userVal === ans.trim();
                });

              return (
                <div className="fillInTheBlankAnswer">
                  <h3 className="fillInTheBlankStatement">
                    <LatexRenderer
                      text={question.question}
                      inputs={userInputs}
                      results={blankResults}
                      modelAnswers={extractedModelAnswers}
                      disabled={true}
                    />
                  </h3>
                  <h3 className="modelAnswerFillInTheBlank">
                    <span>{UI_TEXT.MODEL_ANSWER}</span>
                    {extractedModelAnswers.map((ans, index) => (
                      <span key={index}>{`回答${index + 1}: ${ans} `}</span>
                    ))}
                  </h3>
                </div>
              );
            case "single_choice": // 選択問題(回答一つ)
              return (
                <div className="singleChoiceAnswer">
                  <h3 className="singleChoiceStatement">
                    <span>
                      <LatexRenderer text={question.question} />
                    </span>
                  </h3>
                  <h3 className="userAnswerSingleChoice">
                    <span>{UI_TEXT.YOUR_ANSWER}</span>
                    {question.options.map((option, idx) => (
                      <label
                        key={`optionUserAnswer-${index}-${idx}`}
                        className="checkBoxSingleChoice"
                      >
                        <div
                          className={
                            userRaw === option ? "answerSingleChoice" : "notAnswerSingleChoice"
                          }
                          style={{
                            display: "inline-block",
                            padding: "5px 10px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            margin: "2px",
                          }}
                        >
                          <LatexRenderer text={option} />
                        </div>
                      </label>
                    ))}
                  </h3>
                  <h3 className="modelAnswerSingleChoice">
                    <span>{UI_TEXT.MODEL_ANSWER}</span>
                    {question.options.map((option, idx) => (
                      <label
                        key={`optionModelAnswer-${index}-${idx}`}
                        className="checkBoxSingleChoice"
                      >
                        <div
                          className={
                            question.answer === option ? "answerSingleChoice" : "notAnswerSingleChoice"
                          }
                          style={{
                            display: "inline-block",
                            padding: "5px 10px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            margin: "2px",
                          }}
                        >
                          <LatexRenderer text={option} />
                        </div>
                      </label>
                    ))}
                  </h3>
                </div>
              );
            case "multiple_choice": // 選択問題(回答複数)
              return (
                <div className="multipleChoiceAnswer">
                  <h3 className="multipleChoiceStatement">
                    <span>
                      <LatexRenderer text={question.question} />
                    </span>
                  </h3>
                  <h3 className="userAnswerMultipleChoice">
                    <span>{UI_TEXT.YOUR_ANSWER}</span>
                    {question.options.map((option, idx) => (
                      <label
                        key={`multiUserAnswer-${index}-${idx}`}
                        className="checkBoxMultipleChoice"
                      >
                        {Array.isArray(answers[index]) && (
                          <div
                            className={
                              answers[index][idx] === true
                                ? "answerMultipleChoice"
                                : "notAnswerMultipleChoice"
                            }
                            style={{
                              display: "inline-block",
                              padding: "5px 10px",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              margin: "2px",
                            }}
                          >
                            <LatexRenderer text={option} />
                          </div>
                        )}
                      </label>
                    ))}
                  </h3>
                  <h3 className="modelAnswerMultipleChoice">
                    <span>{UI_TEXT.MODEL_ANSWER}</span>
                    {question.options.map((option, idx) => (
                      <label
                        key={`multiModelAnswer-${index}-${idx}`}
                        className="checkBoxMultipleChoice"
                      >
                        {Array.isArray(question.answer) && (
                          <div
                            className={
                              question.answer[idx] === true
                                ? "answerMultipleChoice"
                                : "notAnswerMultipleChoice"
                            }
                            style={{
                              display: "inline-block",
                              padding: "5px 10px",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              margin: "2px",
                            }}
                          >
                            <LatexRenderer text={option} />
                          </div>
                        )}
                      </label>
                    ))}
                  </h3>
                </div>
              );
            case "ordering":
              return (
                <div className="orderingAnswer">
                  <h3 className="orderingStatement">
                    <span>
                      <LatexRenderer text={question.question} />
                    </span>
                  </h3>
                  <h3 className="orderingUserAnswer">
                    <span>{UI_TEXT.YOUR_ANSWER}</span>
                    <div className="ordering-chip-list">
                      {orderingUserSequence.length > 0 ? (
                        orderingUserSequence.map((item, idx) => (
                          <span key={`user-order-${idx}`} className="ordering-chip">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="ordering-empty">未回答</span>
                      )}
                    </div>
                  </h3>
                  <h3 className="orderingModelAnswer">
                    <span>{UI_TEXT.MODEL_ANSWER}</span>
                    <div className="ordering-chip-list">
                      {orderingCorrectSequence.length > 0 ? (
                        orderingCorrectSequence.map((item, idx) => (
                          <span key={`model-order-${idx}`} className="ordering-chip">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="ordering-empty">正解データなし</span>
                      )}
                    </div>
                  </h3>
                </div>
              );
            case "free_text_input":
              return (
                <div className="freeTextAnswer">
                  <h3 className="freeTextStatement">
                    <span>
                      <LatexRenderer text={question.question} />
                    </span>
                  </h3>
                  <h3 className="userAnswerFreeText">
                    <span>
                      {UI_TEXT.YOUR_ANSWER}
                      <LatexRenderer text={extractFreeTextValue(userRaw)} />
                    </span>
                  </h3>
                  <h3 className="modelAnswerFreeText">
                    <span>
                      {UI_TEXT.MODEL_ANSWER}
                      <LatexRenderer
                        text={
                          typeof (question.correctAnswer || question.answer) === "string"
                            ? question.correctAnswer || question.answer
                            : ""
                        }
                      />
                    </span>
                  </h3>
                  {/* 採点AIからの解説も表示 */}
                  {showAiLoginHint && (
                    <p className="ai-login-hint">
                      AI採点はログイン後に利用できます。今回は模範解答との一致で判定しました。
                    </p>
                  )}
                  {verdictSource === VERDICT_SOURCE.AI && aiExplanation && (
                    <h4 className="aiExplanation">
                      <span>
                        {UI_TEXT.AI_EXPLANATION}
                        <LatexRenderer text={aiExplanation} />
                      </span>
                    </h4>
                  )}
                </div>
              );
            case "calculation":
              // 計算問題の表示ロジック
              // answers[index] は { userAnswer, generatedQuestion, calculatedAnswer, scope } のオブジェクト
              const calcData = answers[index] || {};
              const calcQuestionText = calcData.generatedQuestion || question.question;
              const calcUserAnswer = calcData.userAnswer !== undefined ? calcData.userAnswer : "";
              const calcModelAnswer =
                calcData.calculatedAnswer !== undefined
                  ? calcData.calculatedAnswer
                  : question.correctAnswer || question.answer;

              return (
                <div className="calculationAnswer">
                  <h3 className="calculationStatement">
                    <span>
                      <LatexRenderer text={calcQuestionText} />
                    </span>
                  </h3>
                  <h3 className="userAnswerCalculation">
                    <span>
                      {UI_TEXT.YOUR_ANSWER}
                      {calcUserAnswer}
                    </span>
                  </h3>
                  <h3 className="modelAnswerCalculation">
                    <span>
                      {UI_TEXT.MODEL_ANSWER}
                      {calcModelAnswer}
                    </span>
                  </h3>
                </div>
              );
            case "numeric_input":
              return (
                <div className="freeTextAnswer">
                  <h3 className="freeTextStatement">
                    <span>
                      <LatexRenderer text={question.question} />
                    </span>
                  </h3>
                  <h3 className="userAnswerFreeText">
                    <span>
                      {UI_TEXT.YOUR_ANSWER}
                      <LatexRenderer text={userAnswer} />
                    </span>
                  </h3>
                  <h3 className="modelAnswerFreeText">
                    <span>
                      {UI_TEXT.MODEL_ANSWER}
                      <LatexRenderer text={modelAnswer} />
                    </span>
                  </h3>
                </div>
              );
            default: // それ以外(計算、並び替えなど)
              return (
                <div className="elseAnswer">
                  <h3 className="elseStatement">
                    <span>
                      <LatexRenderer text={question.question} />
                    </span>
                  </h3>
                  <h3 className="userAnswerElse">
                    <span>
                      {UI_TEXT.YOUR_ANSWER}
                      <LatexRenderer text={userAnswer} />
                    </span>
                  </h3>
                  <h3 className="modelAnswerElse">
                    <span>
                      {UI_TEXT.MODEL_ANSWER}
                      <LatexRenderer text={modelAnswer} />
                    </span>
                  </h3>
                </div>
              );
          }
        })()}
      </>
    );
  };

  return (
    <div className="answerResult">
      {/* 正誤判定 */}
      <h3>
        <span className="answerNumber">
          {UI_TEXT.QUESTION_PREFIX}
          {index + 1}
        </span>
        <span className="correction">
          {isCorrect ? (
            <span className="correct">{UI_TEXT.CORRECT}</span>
          ) : (
            <span className="wrong">{UI_TEXT.INCORRECT}</span>
          )}
        </span>
      </h3>
      {/* 問題と回答の表示 */}
      {renderContent()}
      {/* 解説 */}
      {explanationText && (
        <h4 className="explanation">
          <span>
            {UI_TEXT.EXPLANATION}
            <LatexRenderer text={explanationText} />
          </span>
        </h4>)}
      <br />
    </div>
  );
};

export default AnswerResult;
