import { extractAnswersFromText } from "./quizUtils";

const NUMBER_COMPARISON_TOLERANCE = 0.000001;

const sanitizeStructuredAnswer = (value) => {
  if (value === null || value === undefined) return "";
  const stringified = JSON.stringify(value);
  if (typeof stringified !== "string") return "";
  return stringified.replace(/"/g, "").replace(/\s/g, "");
};

export const parseOrderingSequence = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    // 文字列がJSON配列ならパースを試みる
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v).trim()).filter(Boolean);
        }
      } catch (err) {
        // fall back to whitespace split
      }
    }
    return trimmed
      .split(/\s+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
};

export const extractFreeTextValue = (raw) => {
  if (typeof raw === "string") return raw;
  if (typeof raw?.textValue === "string") return raw.textValue;
  return "";
};

export const normalizeFreeTextValue = (value, caseSensitive = false) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return caseSensitive ? trimmed : trimmed.toLowerCase();
};

const isAnswerProvided = (value) => {
  if (value === null || value === undefined) return false;

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "boolean") {
    // true/false型のトップレベルは回答ありとみなす
    return true;
  }

  if (typeof value === "number") {
    return !isNaN(value);
  }

  if (typeof value === "object" && typeof value.textValue === "string") {
    return value.textValue.trim().length > 0;
  }

  if (Array.isArray(value)) {
    // 配列中のbooleanはtrueのみ回答あり扱い／それ以外は再帰で判定
    return value.some((entry) => {
      if (typeof entry === "boolean") {
        return entry === true;
      }
      return isAnswerProvided(entry);
    });
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return false;
};

export const VERDICT_SOURCE = {
  AI: "ai",
  AI_PENDING: "ai-pending",
  MANUAL: "manual",
  MANUAL_FALLBACK: "manual-fallback",
  UNANSWERED: "unanswered",
};

export const evaluateQuestionAnswer = ({ question, userAnswer, options = {} }) => {
  const { aiResult = null, isLoggedIn = false } = options;
  const questionType = question.questionType;
  const requiresAI =
    questionType === "free_text_input" && question.gradingSettings?.useGeminiForGrading;

  const baseResult = {
    questionId: question.questionId,
    questionType,
    requiresAI,
    isCorrect: false,
    verdictSource: VERDICT_SOURCE.UNANSWERED,
    aiExplanation: null,
    usedCaseSensitive: question.gradingSettings?.caseSensitive ?? false,
  };

  // 穴埋めは先に模範解答を抽出（表示に必要）
  if (questionType === "fill_in_the_blank") {
    // quizUtilsの共有ロジックを使用
    const extractedModelAnswers = extractAnswersFromText(question.question);

    const userInputs = Array.isArray(userAnswer) ? userAnswer : [];

    // いずれか入力があるか判定
    if (!isAnswerProvided(userAnswer)) {
      return {
        ...baseResult,
        extractedModelAnswers,
        blankResults: extractedModelAnswers.map(() => false),
      };
    }

    // 空欄ごとの正誤
    const blankResults = extractedModelAnswers.map((ans, idx) => {
      const userVal = (userInputs[idx] || "").trim();
      return userVal === ans;
    });

    // 全空欄正解なら全体正解
    const allCorrect =
      extractedModelAnswers.length > 0 &&
      blankResults.length === extractedModelAnswers.length &&
      blankResults.every(Boolean);

    return {
      ...baseResult,
      isCorrect: allCorrect,
      verdictSource: VERDICT_SOURCE.MANUAL,
      blankResults,
      extractedModelAnswers,
    };
  }

  // 未回答なら早期リターン（穴埋め以外）
  if (!isAnswerProvided(userAnswer)) {
    return baseResult;
  }

  if (questionType === "free_text_input") {
    const caseSensitive = question.gradingSettings?.caseSensitive ?? false;
    const userText = extractFreeTextValue(userAnswer);
    const correctText =
      typeof (question.correctAnswer || question.answer) === "string"
        ? question.correctAnswer || question.answer
        : "";

    if (!userText.trim()) {
      return baseResult;
    }

    if (requiresAI && aiResult) {
      return {
        ...baseResult,
        isCorrect: Boolean(aiResult.isCorrect),
        aiExplanation: aiResult.explanation || null,
        verdictSource: VERDICT_SOURCE.AI,
      };
    }

    const normalizedUser = normalizeFreeTextValue(userText, caseSensitive);
    const normalizedCorrect = normalizeFreeTextValue(correctText, caseSensitive);

    const verdictSource = requiresAI
      ? isLoggedIn
        ? VERDICT_SOURCE.AI_PENDING
        : VERDICT_SOURCE.MANUAL_FALLBACK
      : VERDICT_SOURCE.MANUAL;

    return {
      ...baseResult,
      isCorrect: normalizedUser.length > 0 && normalizedUser === normalizedCorrect,
      verdictSource,
    };
  }

  if (questionType === "calculation") {
    const userVal = parseFloat(userAnswer?.userAnswer);
    const calcVal = parseFloat(userAnswer?.calculatedAnswer);
    const hasValues = !isNaN(userVal) && !isNaN(calcVal);

    return {
      ...baseResult,
      isCorrect: hasValues && Math.abs(userVal - calcVal) < NUMBER_COMPARISON_TOLERANCE,
      verdictSource: VERDICT_SOURCE.MANUAL,
    };
  }

  if (questionType === "numeric_input") {
    const userVal = parseFloat(userAnswer);
    const modelVal = parseFloat(question.correctAnswer || question.answer);
    const hasValues = !isNaN(userVal) && !isNaN(modelVal);

    return {
      ...baseResult,
      isCorrect: hasValues && Math.abs(userVal - modelVal) < NUMBER_COMPARISON_TOLERANCE,
      verdictSource: VERDICT_SOURCE.MANUAL,
    };
  }

  if (questionType === "ordering") {
    const correctSequence = parseOrderingSequence(question.correctAnswer ?? question.answer);
    const userSequence = parseOrderingSequence(userAnswer);
    const hasAnswer = userSequence.length > 0;
    const sameLength = correctSequence.length > 0 && correctSequence.length === userSequence.length;
    const isCorrect =
      sameLength && correctSequence.every((value, idx) => value === userSequence[idx]);

    return {
      ...baseResult,
      isCorrect: hasAnswer && isCorrect,
      verdictSource: VERDICT_SOURCE.MANUAL,
      normalizedUserAnswer: userSequence,
      normalizedCorrectAnswer: correctSequence,
    };
  }

  // Default handling (true/false, single choice, multiple choice, etc.)
  const userValue = sanitizeStructuredAnswer(userAnswer);
  const correctValue = sanitizeStructuredAnswer(question.answer ?? question.correctAnswer);

  if (!userValue) {
    return baseResult;
  }

  return {
    ...baseResult,
    isCorrect: userValue === correctValue,
    verdictSource: VERDICT_SOURCE.MANUAL,
  };
};

export { NUMBER_COMPARISON_TOLERANCE };
