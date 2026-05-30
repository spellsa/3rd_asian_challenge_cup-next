// Gemini API とのやり取りとレスポンス整形・採点ロジックを担うサービス
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import "dotenv/config";
import { systemPromptTemplate, gradingSystemPromptTemplate } from "../utils/prompts.js";
import { questionSetSchema } from "../utils/schemas.js";
import { GEMINI_MODEL_NAME, MIME_TYPES } from "../config/constants.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CONTROL_CHAR_MAP = {
  "\b": "\\b",
  "\t": "\\t",
  "\f": "\\f",
  "\r": "\\r",
};

// プロンプトサニタイズ関数
function sanitizeUserPrompt(prompt) {
  if (!prompt) return "";
  if (prompt.length > 20000) {
    throw new Error("プロンプトが長すぎます。20000文字以内で入力してください。");
  }
  // 区切り文字を無効化してインジェクションを防ぐ
  return prompt.replace(/--userRequest/g, "__userRequest");
}

function restoreLatexEscapes(value) {
  if (typeof value === "string") {
    return restoreLatexInString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => restoreLatexEscapes(item));
  }
  if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => {
      value[key] = restoreLatexEscapes(value[key]);
    });
    return value;
  }
  return value;
}

function restoreLatexInString(str) {
  let result = "";
  let i = 0;
  let inInlineMath = false;
  let inBlockMath = false;

  while (i < str.length) {
    const char = str[i];

    if (char === "$") {
      const isDouble = str[i + 1] === "$";
      if (isDouble) {
        inBlockMath = !inBlockMath;
        result += "$$";
        i += 2;
        continue;
      }
      inInlineMath = !inInlineMath;
      result += "$";
      i += 1;
      continue;
    }

    if ((inInlineMath || inBlockMath) && CONTROL_CHAR_MAP[char]) {
      result += CONTROL_CHAR_MAP[char];
      i += 1;
      continue;
    }

    result += char;
    i += 1;
  }

  return result;
}

function truncateForLog(str, maxLength = 200) {
  if (typeof str !== "string") return null;
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

function extractRawLatexSample(rawText) {
  if (typeof rawText !== "string") return null;
  const latexPattern = /\\(?:text|frac|sqrt|mathrm|left|right|begin|end|rightarrow|to|sum|int)/;
  const match = rawText.match(latexPattern);
  if (!match) return null;
  const start = Math.max(match.index - 40, 0);
  const end = Math.min(match.index + 80, rawText.length);
  return truncateForLog(rawText.slice(start, end));
}

function extractLatexSampleFromValue(value) {
  if (typeof value === "string") {
    if (value.includes("\\")) {
      const match = value.match(/\\[a-zA-Z]+/);
      if (match) {
        return truncateForLog(value);
      }
    }
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const sample = extractLatexSampleFromValue(item);
      if (sample) return sample;
    }
    return null;
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      const sample = extractLatexSampleFromValue(value[key]);
      if (sample) return sample;
    }
  }

  return null;
}

function parseGeminiResponseText(rawText, contextLabel) {
  const label = contextLabel || "unknown";

  if (!rawText) {
    console.warn(`[GEMINI_LATEX][${label}] 空のレスポンスを受信しました。`);
    return null;
  }

  const rawLatexSample = extractRawLatexSample(rawText);
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    console.error(`[GEMINI_LATEX][${label}] JSON.parse failed: ${error.message}`);
    throw error;
  }

  const parsedSampleBeforeRestore = extractLatexSampleFromValue(parsed);

  const restored = restoreLatexEscapes(parsed);
  const restoredSample = extractLatexSampleFromValue(restored);

  return restored;
}

// ファイルをGeminiにアップロードする関数
export async function uploadFileToGemini(filePath) {
  const fileName = path.basename(filePath); // ファイル名を取得
  const fileExtension = path.extname(fileName).toLowerCase(); // ファイルの拡張子を取得

  let mineType;
  // ファイルの拡張子に応じてMIMEタイプを設定
  switch (fileExtension) {
    case ".png":
      mineType = MIME_TYPES.PNG;
      break;
    case ".jpg":
    case ".jpeg":
      mineType = MIME_TYPES.JPEG;
      break;
    case ".pdf":
      mineType = MIME_TYPES.PDF;
      break;
    case ".txt":
      mineType = MIME_TYPES.TXT;
      break;
    default:
      throw new Error(`サポートされていないファイル形式です: ${fileExtension}`);
  }

  // FileAPIを使用して、Geminiが読み込めるようにファイルをアップロード
  const _uploadedFile = await ai.files.upload({
    file: filePath,
    config: { mimeType: mineType },
  });
  console.log(
    "アップロードが完了しました　Uploaded URL:",
    _uploadedFile.uri,
    "MIME Type:",
    _uploadedFile.mimeType,
  );
  return _uploadedFile;
}

// 実際にgeminiを使って問題セットを生成する関数（ファイルベース）
export async function generateQuestionSetWithGemini(
  uploadedFiles,
  userPrompt = null,
  questionCount = null,
  formats = null,
) {
  console.log("Geminiを使って問題セットを生成します（ファイルベース）.....");

  const sanitizedPrompt = sanitizeUserPrompt(userPrompt);

  const systemPrompt = `
  --systemPromptBegin--
  以下の指示に従って、問題セットを生成してください。
  ${systemPromptTemplate}
  `;

  let userPromptText = `
    --userRequestBegin--
    以下の添付ファイルをもとに、問題を生成してください。
  `;

  if (questionCount && questionCount > 0) {
    userPromptText += `\n    生成する問題数: ${questionCount}問`;
  } else {
    userPromptText += `\n    生成する問題数は指定しません。内容に応じて適切な数を自動で決めてください。`;
  }

  if (formats && formats.length > 0) {
    userPromptText += `\n    利用可能な問題タイプ: ${formats.join(
      ", ",
    )}\n    これらのタイプから適切に選択してください。`;
  } else {
    userPromptText += `\n    すべての問題タイプを一度は使用してください。`;
  }

  if (sanitizedPrompt) {
    userPromptText += `\n\n    追加の指示:\n    ${sanitizedPrompt}`;
  }

  userPromptText += `\n    --userRequestEnd--\n    `;

  const content = [userPromptText];
  content.push(...uploadedFiles); // 配列を展開して追加

  const geminiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    //model: "gemini-2.5-flash",
    contents: content,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: questionSetSchema, // 問題セットのスキーマを指定
    },
  });

  // console.log(geminiResponse.text);
  return parseGeminiResponseText(geminiResponse.text, "generateQuestionSetWithGemini");
}

// 実際にgeminiを使って問題セットを生成する関数（プロンプトのみ）
export async function generateQuestionSetWithPrompt(
  userPrompt,
  questionCount = null,
  formats = null,
) {
  console.log("Geminiを使って問題セットを生成します（プロンプトベース）.....");

  const sanitizedPrompt = sanitizeUserPrompt(userPrompt);

  const systemPrompt = `
  --systemPromptBegin--
  以下の指示に従って、問題セットを生成してください。
  ${systemPromptTemplate}
  `;

  let userPromptText = `
    --userRequestBegin--
    以下のプロンプトに基づいて、問題を生成してください.

    ${sanitizedPrompt}
  `;

  if (questionCount && questionCount > 0) {
    userPromptText += `\n\n    生成する問題数: ${questionCount}問`;
  } else {
    userPromptText += `\n\n    生成する問題数は指定しません。内容に応じて適切な数を自動で決めてください。`;
  }

  if (formats && formats.length > 0) {
    userPromptText += `\n\n    利用可能な問題タイプ: ${formats.join(
      ", ",
    )}\n    これらのタイプから適切に選択してください。`;
  } else {
    userPromptText += `\n\n    すべての問題タイプを一度は使用してください。`;
  }

  userPromptText += `\n    --userRequestEnd--\n    `;

  const content = [userPromptText];

  const geminiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    //model: "gemini-2.5-flash",
    contents: content,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: questionSetSchema,
    },
  });

  // console.log(geminiResponse.text);
  return parseGeminiResponseText(geminiResponse.text, "generateQuestionSetWithPrompt");
}

// APIエンドポイントからの採点リクエストを処理する関数
export async function gradeFreeTextQuestion(questions) {
  console.log("Geminiを使って記述問題の採点を実行します。");

  const systemPrompt = gradingSystemPromptTemplate;

  const userPromptText = `
    --userRequestBegin--
    以下の情報をもとに、記述問題の採点を行ってください。
    ${JSON.stringify(questions, null, 2)}
    --userRequestEnd--
  `;

  const content = [userPromptText];

  // Geminiを使用して記述問題の採点を実行
  const geminiResponse = await ai.models.generateContent({
    model: GEMINI_MODEL_NAME,
    contents: content,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          required: ["isCorrect", "explanation"],
          propertyOrdering: ["isCorrect", "explanation"],
          properties: {
            isCorrect: {
              type: Type.BOOLEAN,
              description: "ユーザーの回答が正しいかどうか（正解であればtrue、誤りであればfalse）",
            },
            explanation: {
              type: Type.STRING,
              description: "ユーザーへのフィードバック",
            },
          },
        },
      },
    },
  });

  // console.log("Geminiのレスポンス:", geminiResponse.text);

  return parseGeminiResponseText(geminiResponse.text, "gradeFreeTextQuestion");
}
