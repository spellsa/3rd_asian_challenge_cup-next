/**
 * grading.js のユニットテスト
 * isAnswerProvided の挙動と各問題タイプの evaluateQuestionAnswer を検証
 *
 * 実行例: npx jest src/utils/grading.test.js
 */

import {
  evaluateQuestionAnswer,
  VERDICT_SOURCE,
  parseOrderingSequence,
  extractFreeTextValue,
  normalizeFreeTextValue,
} from "./grading";

// =============================================================================
// isAnswerProvided の挙動（evaluateQuestionAnswer 経由で検証）
// =============================================================================

describe("isAnswerProvided (via evaluateQuestionAnswer)", () => {
  const makeQuestion = (type, answer = "test") => ({
    questionId: "q1",
    questionType: type,
    question: "Test question",
    answer,
  });

  describe("boolean 判定", () => {
    it("true_falseでtrueは回答あり", () => {
      const result = evaluateQuestionAnswer({
        question: makeQuestion("true_false", true),
        userAnswer: true,
      });
      expect(result.verdictSource).not.toBe(VERDICT_SOURCE.UNANSWERED);
    });

    it("true_falseでfalseも回答あり", () => {
      const result = evaluateQuestionAnswer({
        question: makeQuestion("true_false", false),
        userAnswer: false,
      });
      expect(result.verdictSource).not.toBe(VERDICT_SOURCE.UNANSWERED);
      expect(result.isCorrect).toBe(true); // false同士で正解
    });

    it("true_falseで誤答を検出する", () => {
      const result = evaluateQuestionAnswer({
        question: makeQuestion("true_false", true),
        userAnswer: false,
      });
      expect(result.verdictSource).toBe(VERDICT_SOURCE.MANUAL);
      expect(result.isCorrect).toBe(false);
    });
  });

  describe("配列boolean判定 (multiple_choice)", () => {
    it("全てfalseなら未回答扱い", () => {
      const result = evaluateQuestionAnswer({
        question: {
          ...makeQuestion("multiple_choice"),
          options: ["A", "B", "C"],
          answer: [true, false, false],
        },
        userAnswer: [false, false, false],
      });
      expect(result.verdictSource).toBe(VERDICT_SOURCE.UNANSWERED);
    });

    it("trueを含めば回答あり扱い", () => {
      const result = evaluateQuestionAnswer({
        question: {
          ...makeQuestion("multiple_choice"),
          options: ["A", "B", "C"],
          answer: [true, false, false],
        },
        userAnswer: [true, false, false],
      });
      expect(result.verdictSource).not.toBe(VERDICT_SOURCE.UNANSWERED);
      expect(result.isCorrect).toBe(true);
    });

    it("複数選択で誤答を検出する", () => {
      const result = evaluateQuestionAnswer({
        question: {
          ...makeQuestion("multiple_choice"),
          options: ["A", "B", "C"],
          answer: [true, false, false],
        },
        userAnswer: [false, true, false],
      });
      expect(result.isCorrect).toBe(false);
    });
  });

  describe("文字列判定", () => {
    it("空文字は未回答", () => {
      const result = evaluateQuestionAnswer({
        question: makeQuestion("single_choice", "A"),
        userAnswer: "",
      });
      expect(result.verdictSource).toBe(VERDICT_SOURCE.UNANSWERED);
    });

    it("空白のみは未回答", () => {
      const result = evaluateQuestionAnswer({
        question: makeQuestion("single_choice", "A"),
        userAnswer: "   ",
      });
      expect(result.verdictSource).toBe(VERDICT_SOURCE.UNANSWERED);
    });

    it("非空文字列は回答あり", () => {
      const result = evaluateQuestionAnswer({
        question: makeQuestion("single_choice", "A"),
        userAnswer: "A",
      });
      expect(result.verdictSource).not.toBe(VERDICT_SOURCE.UNANSWERED);
    });
  });

  describe("数値判定", () => {
    it("0は回答あり (numeric_input)", () => {
      const result = evaluateQuestionAnswer({
        question: makeQuestion("numeric_input", 0),
        userAnswer: 0,
      });
      expect(result.verdictSource).not.toBe(VERDICT_SOURCE.UNANSWERED);
      expect(result.isCorrect).toBe(true);
    });

    it("NaNは未回答扱い", () => {
      const result = evaluateQuestionAnswer({
        question: makeQuestion("numeric_input", 5),
        userAnswer: NaN,
      });
      // NaN は isNaN 判定で弾かれるため未回答扱い
      expect(result.verdictSource).toBe(VERDICT_SOURCE.UNANSWERED);
    });
  });

  describe("null/undefined handling", () => {
    it("should treat null as unanswered", () => {
      const result = evaluateQuestionAnswer({
        question: makeQuestion("single_choice", "A"),
        userAnswer: null,
      });
      expect(result.verdictSource).toBe(VERDICT_SOURCE.UNANSWERED);
    });

    it("should treat undefined as unanswered", () => {
      const result = evaluateQuestionAnswer({
        question: makeQuestion("single_choice", "A"),
        userAnswer: undefined,
      });
      expect(result.verdictSource).toBe(VERDICT_SOURCE.UNANSWERED);
    });
  });
});

// =============================================================================
// 各問題タイプの evaluateQuestionAnswer テスト
// =============================================================================

describe("evaluateQuestionAnswer", () => {
  describe("fill_in_the_blank", () => {
    const fillQuestion = {
      questionId: "fill1",
      questionType: "fill_in_the_blank",
      question: "The capital of Japan is {{:Tokyo:}} and France is {{:Paris:}}.",
    };

    it("should always return extractedModelAnswers even when unanswered", () => {
      const result = evaluateQuestionAnswer({
        question: fillQuestion,
        userAnswer: [],
      });
      expect(result.extractedModelAnswers).toEqual(["Tokyo", "Paris"]);
      expect(result.blankResults).toEqual([false, false]);
      expect(result.isCorrect).toBe(false);
      expect(result.verdictSource).toBe(VERDICT_SOURCE.UNANSWERED);
    });

    it("should return extractedModelAnswers when partially answered", () => {
      const result = evaluateQuestionAnswer({
        question: fillQuestion,
        userAnswer: ["Tokyo", ""],
      });
      expect(result.extractedModelAnswers).toEqual(["Tokyo", "Paris"]);
      expect(result.blankResults).toEqual([true, false]);
      expect(result.isCorrect).toBe(false);
    });

    it("should be correct when all blanks are correct", () => {
      const result = evaluateQuestionAnswer({
        question: fillQuestion,
        userAnswer: ["Tokyo", "Paris"],
      });
      expect(result.extractedModelAnswers).toEqual(["Tokyo", "Paris"]);
      expect(result.blankResults).toEqual([true, true]);
      expect(result.isCorrect).toBe(true);
      expect(result.verdictSource).toBe(VERDICT_SOURCE.MANUAL);
    });

    it("should handle [[:answer:]] format", () => {
      const altQuestion = {
        ...fillQuestion,
        question: "Answer is [[:correct:]].",
      };
      const result = evaluateQuestionAnswer({
        question: altQuestion,
        userAnswer: ["correct"],
      });
      expect(result.extractedModelAnswers).toEqual(["correct"]);
      expect(result.isCorrect).toBe(true);
    });
  });

  describe("true_false", () => {
    const tfQuestion = {
      questionId: "tf1",
      questionType: "true_false",
      question: "The sky is blue.",
      answer: true,
    };

    it("should be correct when user selects true for true answer", () => {
      const result = evaluateQuestionAnswer({
        question: tfQuestion,
        userAnswer: true,
      });
      expect(result.isCorrect).toBe(true);
    });

    it("should be incorrect when user selects false for true answer", () => {
      const result = evaluateQuestionAnswer({
        question: tfQuestion,
        userAnswer: false,
      });
      expect(result.isCorrect).toBe(false);
    });

    it("should be correct when user selects false for false answer", () => {
      const result = evaluateQuestionAnswer({
        question: { ...tfQuestion, answer: false },
        userAnswer: false,
      });
      expect(result.isCorrect).toBe(true);
    });
  });

  describe("single_choice", () => {
    const scQuestion = {
      questionId: "sc1",
      questionType: "single_choice",
      question: "What is 1+1?",
      options: ["1", "2", "3"],
      answer: "2",
    };

    it("should be correct when selecting correct option", () => {
      const result = evaluateQuestionAnswer({
        question: scQuestion,
        userAnswer: "2",
      });
      expect(result.isCorrect).toBe(true);
    });

    it("should be incorrect when selecting wrong option", () => {
      const result = evaluateQuestionAnswer({
        question: scQuestion,
        userAnswer: "3",
      });
      expect(result.isCorrect).toBe(false);
    });
  });

  describe("numeric_input", () => {
    const numQuestion = {
      questionId: "num1",
      questionType: "numeric_input",
      question: "What is 2+2?",
      correctAnswer: 4,
    };

    it("should be correct for exact match", () => {
      const result = evaluateQuestionAnswer({
        question: numQuestion,
        userAnswer: 4,
      });
      expect(result.isCorrect).toBe(true);
    });

    it("should be correct for very close values (tolerance)", () => {
      const result = evaluateQuestionAnswer({
        question: numQuestion,
        userAnswer: 4.0000001,
      });
      expect(result.isCorrect).toBe(true);
    });

    it("should be incorrect for different values", () => {
      const result = evaluateQuestionAnswer({
        question: numQuestion,
        userAnswer: 5,
      });
      expect(result.isCorrect).toBe(false);
    });

    it("should handle string input that parses to number", () => {
      const result = evaluateQuestionAnswer({
        question: numQuestion,
        userAnswer: "4",
      });
      expect(result.isCorrect).toBe(true);
    });
  });

  describe("calculation", () => {
    const calcQuestion = {
      questionId: "calc1",
      questionType: "calculation",
      question: "Calculate: {{var:a}} + {{var:b}}",
    };

    it("should be correct when userAnswer matches calculatedAnswer", () => {
      const result = evaluateQuestionAnswer({
        question: calcQuestion,
        userAnswer: {
          userAnswer: 15,
          calculatedAnswer: 15,
          scope: { a: 10, b: 5 },
        },
      });
      expect(result.isCorrect).toBe(true);
    });

    it("should be incorrect when userAnswer differs from calculatedAnswer", () => {
      const result = evaluateQuestionAnswer({
        question: calcQuestion,
        userAnswer: {
          userAnswer: 10,
          calculatedAnswer: 15,
          scope: { a: 10, b: 5 },
        },
      });
      expect(result.isCorrect).toBe(false);
    });
  });

  describe("ordering", () => {
    const orderQuestion = {
      questionId: "ord1",
      questionType: "ordering",
      question: "Put in order",
      answer: ["A", "B", "C"],
    };

    it("should be correct for exact sequence match", () => {
      const result = evaluateQuestionAnswer({
        question: orderQuestion,
        userAnswer: ["A", "B", "C"],
      });
      expect(result.isCorrect).toBe(true);
      expect(result.normalizedUserAnswer).toEqual(["A", "B", "C"]);
      expect(result.normalizedCorrectAnswer).toEqual(["A", "B", "C"]);
    });

    it("should be incorrect for wrong sequence", () => {
      const result = evaluateQuestionAnswer({
        question: orderQuestion,
        userAnswer: ["C", "B", "A"],
      });
      expect(result.isCorrect).toBe(false);
    });

    it("should handle string input that can be parsed", () => {
      const result = evaluateQuestionAnswer({
        question: orderQuestion,
        userAnswer: "A B C",
      });
      expect(result.isCorrect).toBe(true);
    });
  });

  describe("free_text_input", () => {
    const ftQuestion = {
      questionId: "ft1",
      questionType: "free_text_input",
      question: "What is the capital of Japan?",
      correctAnswer: "Tokyo",
      gradingSettings: {
        caseSensitive: false,
        useGeminiForGrading: false,
      },
    };

    it("should be correct for exact match (case insensitive)", () => {
      const result = evaluateQuestionAnswer({
        question: ftQuestion,
        userAnswer: "tokyo",
      });
      expect(result.isCorrect).toBe(true);
    });

    it("should be correct for exact match with different case", () => {
      const result = evaluateQuestionAnswer({
        question: ftQuestion,
        userAnswer: "TOKYO",
      });
      expect(result.isCorrect).toBe(true);
    });

    it("should respect case sensitivity when enabled", () => {
      const result = evaluateQuestionAnswer({
        question: {
          ...ftQuestion,
          gradingSettings: { ...ftQuestion.gradingSettings, caseSensitive: true },
        },
        userAnswer: "tokyo",
      });
      expect(result.isCorrect).toBe(false);
    });

    it("should handle textValue object format", () => {
      const result = evaluateQuestionAnswer({
        question: ftQuestion,
        userAnswer: { textValue: "Tokyo" },
      });
      expect(result.isCorrect).toBe(true);
    });
  });
});

// =============================================================================
// ヘルパー関数のテスト
// =============================================================================

describe("parseOrderingSequence", () => {
  it("should parse array input", () => {
    expect(parseOrderingSequence(["A", "B", "C"])).toEqual(["A", "B", "C"]);
  });

  it("should parse space-separated string", () => {
    expect(parseOrderingSequence("A B C")).toEqual(["A", "B", "C"]);
  });

  it("should parse JSON array string", () => {
    expect(parseOrderingSequence('["A","B","C"]')).toEqual(["A", "B", "C"]);
  });

  it("should return empty array for empty input", () => {
    expect(parseOrderingSequence("")).toEqual([]);
    expect(parseOrderingSequence([])).toEqual([]);
  });
});

describe("extractFreeTextValue", () => {
  it("should return string as-is", () => {
    expect(extractFreeTextValue("hello")).toBe("hello");
  });

  it("should extract textValue from object", () => {
    expect(extractFreeTextValue({ textValue: "hello" })).toBe("hello");
  });

  it("should return empty string for invalid input", () => {
    expect(extractFreeTextValue(null)).toBe("");
    expect(extractFreeTextValue(undefined)).toBe("");
    expect(extractFreeTextValue({})).toBe("");
  });
});

describe("normalizeFreeTextValue", () => {
  it("should trim and lowercase by default", () => {
    expect(normalizeFreeTextValue("  Hello World  ")).toBe("hello world");
  });

  it("should preserve case when caseSensitive is true", () => {
    expect(normalizeFreeTextValue("  Hello World  ", true)).toBe("Hello World");
  });

  it("should return empty string for non-string input", () => {
    expect(normalizeFreeTextValue(null)).toBe("");
    expect(normalizeFreeTextValue(123)).toBe("");
  });
});
