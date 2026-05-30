import { Type } from "@google/genai";

// Gemini APIへ渡す問題セットスキーマ定義
export const questionSetSchema = {
  type: Type.OBJECT,
  required: ["title", "outline", "questions"],
  propertyOrdering: ["title", "outline", "questions"],
  properties: {
    title: {
      // 問題セットのタイトル
      type: Type.STRING,
    },
    outline: {
      // 問題セットの概要
      type: Type.STRING,
    },
    questions: {
      // 問題セットの配列
      type: Type.ARRAY,
      items: {
        anyOf: [
          // true_falseタイプの問題
          {
            type: Type.OBJECT,
            properties: {
              questionType: {
                // 問題のタイプ
                type: Type.STRING,
                enum: ["true_false"],
              },
              questionId: {
                // 問題一問に対して付与されるID
                nullable: true,
              },
              question: {
                // 問題文
                type: Type.STRING,
              },
              answer: {
                // 正解の選択肢
                type: Type.BOOLEAN,
              },
              explanation: {
                // 問題の解説
                type: Type.STRING,
              },
            },
            propertyOrdering: ["questionType", "questionId", "question", "answer", "explanation"],
            required: ["questionType", "questionId", "question", "answer", "explanation"],
          },
          // fill_in_the_blank
          {
            type: Type.OBJECT,
            properties: {
              questionType: {
                type: Type.STRING,
                enum: ["fill_in_the_blank"],
              },
              questionId: {
                nullable: true,
              },
              question: {
                type: Type.STRING,
              },
              answer: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
              explanation: {
                type: Type.STRING,
              },
            },
            propertyOrdering: ["questionType", "questionId", "question", "answer", "explanation"],
            required: ["questionType", "questionId", "question", "answer", "explanation"],
          },
          // free_text_input
          {
            type: Type.OBJECT,
            properties: {
              questionType: {
                type: Type.STRING,
                enum: ["free_text_input"],
              },
              questionId: {
                nullable: true,
              },
              question: {
                type: Type.STRING,
              },
              answer: {
                type: Type.STRING,
              },
              explanation: {
                type: Type.STRING,
              },
              gradingSettings: {
                type: Type.OBJECT,
                properties: {
                  // 採点にgeminiを使用するかどうか
                  useGeminiForGrading: {
                    type: Type.BOOLEAN,
                  },
                  caseSensitive: {
                    // 大文字小文字を区別するかどうか
                    type: Type.BOOLEAN,
                    default: false, // 大文字小文字を区別しない
                  },
                  // 採点基準
                  gradingCriteria: {
                    type: Type.STRING,
                    nullable: true,
                    description:
                      "採点基準の説明。Geminiを使用する場合は、ここに基準を記述してください。",
                  },
                },
                required: ["useGeminiForGrading", "caseSensitive", "gradingCriteria"],
                propertyOrdering: ["useGeminiForGrading", "caseSensitive", "gradingCriteria"],
              },
            },
            propertyOrdering: [
              "questionType",
              "questionId",
              "question",
              "answer",
              "explanation",
              "gradingSettings",
            ],
            required: [
              "questionType",
              "questionId",
              "question",
              "answer",
              "explanation",
              "gradingSettings",
            ],
          },
          // single_choice
          {
            type: Type.OBJECT,
            properties: {
              questionType: {
                type: Type.STRING,
                enum: ["single_choice"],
              },
              questionId: {
                nullable: true,
              },
              question: {
                type: Type.STRING,
              },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
              answer: {
                type: Type.STRING,
              },
              explanation: {
                type: Type.STRING,
              },
            },
            propertyOrdering: [
              "questionType",
              "questionId",
              "question",
              "options",
              "answer",
              "explanation",
            ],
            required: [
              "questionType",
              "questionId",
              "question",
              "options",
              "answer",
              "explanation",
            ],
          },
          // multiple_choice
          {
            type: Type.OBJECT,
            properties: {
              questionType: {
                type: Type.STRING,
                enum: ["multiple_choice"],
              },
              questionId: {
                nullable: true,
              },
              question: {
                type: Type.STRING,
              },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
              answer: {
                type: Type.ARRAY,
                items: {
                  type: Type.BOOLEAN,
                },
              },
              explanation: {
                type: Type.STRING,
              },
            },
            propertyOrdering: [
              "questionType",
              "questionId",
              "question",
              "options",
              "answer",
              "explanation",
            ],
            required: [
              "questionType",
              "questionId",
              "question",
              "options",
              "answer",
              "explanation",
            ],
          },
          // numeric_input
          {
            type: Type.OBJECT,
            properties: {
              questionType: {
                type: Type.STRING,
                enum: ["numeric_input"],
              },
              questionId: {
                nullable: true,
              },
              question: {
                type: Type.STRING,
              },
              answer: {
                type: Type.NUMBER,
              },
              explanation: {
                type: Type.STRING,
              },
            },
            propertyOrdering: ["questionType", "questionId", "question", "answer", "explanation"],
            required: ["questionType", "questionId", "question", "answer", "explanation"],
          },
          // ordering
          {
            type: Type.OBJECT,
            properties: {
              questionType: {
                type: Type.STRING,
                enum: ["ordering"],
              },
              questionId: {
                nullable: true,
              },
              question: {
                type: Type.STRING,
              },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
              answer: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
              explanation: {
                type: Type.STRING,
              },
            },
            propertyOrdering: [
              "questionType",
              "questionId",
              "question",
              "options",
              "answer",
              "explanation",
            ],
            required: [
              "questionType",
              "questionId",
              "question",
              "options",
              "answer",
              "explanation",
            ],
          },
          // calculation
          {
            type: Type.OBJECT,
            properties: {
              questionType: {
                type: Type.STRING,
                enum: ["calculation"],
              },
              questionId: {
                nullable: true,
              },
              question: {
                type: Type.STRING,
              },
              variables: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    min: { type: Type.NUMBER },
                    max: { type: Type.NUMBER },
                    step: { type: Type.NUMBER },
                  },
                  required: ["name", "min", "max", "step"],
                },
              },
              formula: {
                type: Type.STRING,
              },
              answerFormat: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  type: { type: Type.STRING, enum: ["number", "fraction"] },
                  significantFigures: { type: Type.NUMBER, nullable: true },
                },
                required: ["type"],
              },
              explanation: {
                type: Type.STRING,
              },
            },
            propertyOrdering: [
              "questionType",
              "questionId",
              "question",
              "variables",
              "formula",
              "answerFormat",
              "explanation",
            ],
            required: [
              "questionType",
              "questionId",
              "question",
              "variables",
              "formula",
              "explanation",
            ],
          },
        ],
      },
    },
  },
};
