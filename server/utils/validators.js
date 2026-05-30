import { z } from "zod";

// API入力バリデーション用のZodスキーマ定義
export const generateQuestionSetSchema = z
  .object({
    downloadURLs: z.array(z.string().url()).optional(),
    prompt: z.string().optional(),
    questionCount: z.number().int().min(1).max(40).optional(),
    formats: z.array(z.string()).optional(),
    subjectName: z.string().optional(),
  })
  .refine(
    (data) => data.downloadURLs?.length > 0 || (data.prompt && data.prompt.trim().length > 0),
    {
      message: "downloadURLsまたはpromptのいずれかを指定する必要があります。",
    }
  );

export const gradeFreeTextSchema = z
  .array(
    z.object({
      question: z.string(),
      answer: z.string(),
      explanation: z.string(),
      userAnswer: z.object({
        textValue: z.string(),
      }),
      gradingCriteria: z.string().nullable().optional(),
      gradingSettings: z
        .object({
          useGeminiForGrading: z.boolean(),
          caseSensitive: z.boolean().optional(),
          gradingCriteria: z.string().nullable().optional(),
        })
        .optional(),
    })
  )
  .nonempty({ message: "記述問題の配列は空でない必要があります。" });

export const updateQuestionSetSchema = z.object({
  questionSetId: z.string().min(1, { message: "questionSetIdは必須です。" }),
  title: z.string().min(1, { message: "タイトルは必須です。" }).optional(),
  questions: z.array(z.any()).optional(),
  subjectName: z.string().optional(),
});

export const createQuestionSetSchema = z.object({
  title: z.string().min(1, { message: "タイトルは必須です。" }),
  description: z.string().optional(),
  subjectName: z.string().optional(),
  questions: z.array(z.any()).optional(),
});
