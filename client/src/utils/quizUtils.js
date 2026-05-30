/**
 * バックエンドのクイズデータをエディタ互換形式に正規化する
 * @param {Object} data - APIから取得した生のクイズセットデータ
 * @returns {Object} 正規化されたクイズセットデータ
 */
export const normalizeQuestionData = (data) => {
  if (!data || !Array.isArray(data.questions)) {
    return data;
  }

  const normalizedQuestions = data.questions.map((question) => {
    const copy = { ...question };
    // `answer`だけ存在する設問はエディタ互換用に`correctAnswer`へ転記
    if (copy.answer !== undefined && copy.correctAnswer === undefined) {
      // 特定の形式ごとに転記方法を分岐
      if (copy.questionType === "single_choice") {
        copy.correctAnswer = copy.answer;
      } else if (copy.questionType === "multiple_choice") {
        // multiple_choiceは真偽配列を保持しつつ、互換用に選択肢文字列も用意
        if (Array.isArray(copy.answer) && Array.isArray(copy.options)) {
          const selected = copy.options.filter((_, idx) => copy.answer[idx]);
          copy.correctAnswer = selected.join(" ");
        }
      } else if (copy.questionType === "ordering") {
        // orderingは配列/文字列のどちらでも文字列化して揃える
        if (Array.isArray(copy.answer)) copy.correctAnswer = copy.answer.join(" ");
        else if (typeof copy.answer === "string") copy.correctAnswer = copy.answer;
      } else {
        // その他はそのまま転記
        copy.correctAnswer = copy.answer;
      }
    }
    return copy;
  });

  return {
    ...data,
    questions: normalizedQuestions,
  };
};

/**
 * 新しい質問の初期データを生成する
 * @returns {Object} 新規質問オブジェクト
 */
export const createNewQuestion = () => ({
  questionId: crypto.randomUUID(),
  questionType: "single_choice",
  question: "",
  options: ["選択肢1", "選択肢2"],
  correctAnswer: "選択肢1",
  answer: "選択肢1",
  explanation: "",
});

/**
 * 質問タイプ変更時の初期プロパティを取得する
 * @param {string} newType - 新しい質問タイプ
 * @param {Object} currentQuestion - 現在の質問オブジェクト
 * @returns {Object} 変更後の質問オブジェクト（共通プロパティは維持）
 */
export const getInitialQuestionProps = (newType, currentQuestion) => {
  const baseQuestion = {
    questionId: currentQuestion.questionId,
    questionType: newType,
    question: currentQuestion.question,
    imageUrl: currentQuestion.imageUrl,
    explanation: currentQuestion.explanation,
  };

  let newProps = {};
  switch (newType) {
    case "single_choice":
      newProps = {
        options: ["選択肢1", "選択肢2"],
        correctAnswer: "選択肢1",
        answer: "選択肢1",
      };
      break;
    case "multiple_choice":
      newProps = {
        options: ["選択肢1", "選択肢2"],
        correctAnswer: "選択肢1", // 表示用
        answer: [true, false], // ロジック用
      };
      break;
    case "true_false":
      newProps = {
        correctAnswer: true,
        answer: true,
      };
      break;
    case "ordering":
      newProps = {
        options: ["項目1"],
        correctAnswer: "項目1",
        answer: ["項目1"],
      };
      break;
    case "fill_in_the_blank":
      newProps = {
        correctAnswer: "",
      };
      break;
    case "calculation":
      newProps = {
        formula: "",
        variables: [],
      };
      break;
    case "free_text_input":
    case "numeric_input":
      newProps = {
        correctAnswer: "",
        gradingSettings: {
          useGeminiForGrading: false,
          caseSensitive: false,
          gradingCriteria: "",
        },
      };
      break;
    default:
      break;
  }

  return { ...baseQuestion, ...newProps };
};

/* =========================================================================================
 *  Parsers and Regex Constants (共通パース・正規表現ロジック)
 * ========================================================================================= */

// 計算問題の変数抽出用正規表現
// 例: "Calculate area of {{var:width}} x {{var:height}}"
export const CALCULATION_VARIABLE_REGEX = /\{\{var:([a-zA-Z0-9_]+)\}\}/g;

/**
 * テキスト内の `{{var:name}}` を scope の値に置換する
 * @param {string} text - 置換対象のテキスト
 * @param {Object} scope - { variableName: value } 形式のオブジェクト
 * @returns {string} 置換後のテキスト
 */
export const applyVariables = (text, scope) => {
  if (typeof text !== "string" || !scope) return text || "";
  return text.replace(CALCULATION_VARIABLE_REGEX, (_match, name) => {
    const val = scope[name];
    if (val !== undefined && val !== null) {
      return String(val);
    }
    // 値がない場合はプレースホルダーをそのまま残す
    return `{{var:${name}}}`;
  });
};

/**
 * 穴埋め問題をパースして、テキストと空欄（答え付き）の配列に分割する
 * 対応形式: {{:answer:}} または [[ :answer: ]]
 * @param {string} text - 問題文テキスト
 * @returns {Array<{type: 'text'|'blank', content?: string, answer?: string, index?: number}>}
 */
export const parseFillInTheBlank = (text) => {
  if (!text) return [];

  // 正規表現: [[:答え:]] のみをサポート
  const regex = /\[\[:(.*?):\]\]/g;
  const tokens = [];
  let lastIndex = 0;
  let match;
  let blankIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // マッチの開始位置までのテキストを追加
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    // 空欄情報を追加
    const answer = (match[1] || "").trim();
    tokens.push({
      type: "blank",
      answer: answer,
      index: blankIndex,
    });
    blankIndex++;

    lastIndex = regex.lastIndex;
  }

  // 残りのテキストを追加
  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return tokens;
};

/**
 * テキストから穴埋め問題の答えのリストのみを抽出する
 * @param {string} text - 問題文
 * @returns {string[]} 正解リスト
 */
export const extractAnswersFromText = (text) => {
  const tokens = parseFillInTheBlank(text);
  return tokens
    .filter((t) => t.type === "blank")
    .map((t) => t.answer);
};
