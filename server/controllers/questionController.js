// 問題セットの生成・取得・更新・削除などHTTPハンドラを集約
import { db } from "../firebase/firebase.js";
import * as questionService from "../services/questionService.js";
import * as geminiService from "../services/geminiService.js";
import * as userService from "../services/userService.js";
import {
  generateQuestionSetSchema,
  gradeFreeTextSchema,
  updateQuestionSetSchema,
  createQuestionSetSchema,
} from "../utils/validators.js";
import { sendError } from "../utils/responseHelper.js";

export async function generateQuestionSet(req, res) {
  console.log("問題セット生成リクエストを受け取りました。" + JSON.stringify(req.body));

  const validationResult = generateQuestionSetSchema.safeParse(req.body);
  if (!validationResult.success) {
    const msg = validationResult.error?.issues?.[0]?.message || "Invalid payload";
    return res.status(400).json({ error: msg });
  }

  const { downloadURLs, prompt, questionCount, formats, subjectName } = validationResult.data;

  try {
    const questionId = await questionService.handleGenerateQuestionSetRequest(
      { downloadURLs, prompt, questionCount, formats, subjectName },
      req.user.uid
    );
    res.status(200).json({ id: questionId });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getQuestionSetJson(req, res) {
  const { id, subject } = req.query;
  console.log(`問題セットの取得リクエストを受け取りました。ID: ${id}, 科目: ${subject}`);
  if (!id && !subject) {
    return res.status(400).json({ error: "問題セットのIDまたは科目名が必要です。" });
  }

  try {
    if (id) {
      // idが指定されている場合
      console.log("問題セットのIDを指定して取得します。ID:", id);
      const docRef = db.collection("questionSets").doc(id);
      const questionSet = await docRef.get();

      // 問題セットが存在しない場合
      if (!questionSet.exists) {
        return res.status(404).json({ error: "問題セットが見つかりません。" });
      }
      res.status(200).json(questionSet.data());
    } else {
      // 特定の教科の問題セットをすべて取得する場合
      console.log("特定の教科の問題セットを取得します。科目:", subject);
      // Firestoreのクエリを使用して、科目名でフィルタリング
      const docRef = db.collection("questionSets").where("subjectName", "==", subject);
      const questionSetSnapshot = await docRef.get(); // 問題セットのスナップショットを取得

      // 問題セットが存在しない場合
      if (questionSetSnapshot.size === 0) {
        return res.status(404).json({ error: "問題セットが見つかりません。" });
      }

      // 問題セットのIDとタイトルを返す
      const results = questionSetSnapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
      }));
      res.status(200).json(results);
    }
  } catch (error) {
    sendError(res, error);
  }
}

export async function gradeFreeText(req, res) {
  const questions = req.body;
  console.log("記述問題の採点リクエストを受け取りました。", questions);

  const validationResult = gradeFreeTextSchema.safeParse(questions);
  if (!validationResult.success) {
    const msg = validationResult.error?.issues?.[0]?.message || "Invalid payload";
    return res.status(400).json({ error: msg });
  }

  const validatedQuestions = validationResult.data;
  const geminiQuestions = validatedQuestions.filter(
    (question) => question.gradingSettings?.useGeminiForGrading
  );

  if (geminiQuestions.length === 0) {
    return res.status(200).json([]);
  }

  try {
    const gradingResults = await geminiService.gradeFreeTextQuestion(geminiQuestions);
    console.log(gradingResults);
    res.status(200).json(gradingResults);
  } catch (error) {
    sendError(res, error);
  }
}

export async function getMyQuestionSets(req, res) {
  console.log("自分の作成した問題セットの取得リクエストを受け付けました。", req.user.uid);

  try {
    const results = await userService.getMyQuestionSets(req.user.uid);
    res.status(200).json(results);
  } catch (error) {
    console.error("ユーザーが作成した問題の取得に失敗しました。:", error);
    res.status(500).json({ error: "ユーザーが作成した問題の取得に失敗しました。" });
  }
}

export async function updateQuestionSet(req, res) {
  const validationResult = updateQuestionSetSchema.safeParse(req.body);
  if (!validationResult.success) {
    const msg = validationResult.error?.issues?.[0]?.message || "Invalid payload";
    return res.status(400).json({ error: msg });
  }

  const { questionSetId, ...updateData } = validationResult.data;

  try {
    await questionService.updateQuestionSetInDatabase(questionSetId, req.user.uid, updateData);
    res.status(200).json({ message: "問題セットが更新されました。" });
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteQuestionSet(req, res) {
  const { id } = req.params;
  console.log(`問題セット削除リクエストを受け取りました。ID: ${id}`);

  if (!id) {
    return res.status(400).json({ error: "問題セットIDが必要です。" });
  }

  try {
    await questionService.deleteQuestionSetFromDatabase(id, req.user.uid);
    res.status(200).json({ message: "問題セットが削除されました。" });
  } catch (error) {
    sendError(res, error);
  }
}

export async function createQuestionSet(req, res) {
  console.log("問題セット作成リクエストを受け取りました。", req.body);

  const validationResult = createQuestionSetSchema.safeParse(req.body);
  if (!validationResult.success) {
    const msg = validationResult.error?.issues?.[0]?.message || "Invalid payload";
    return res.status(400).json({ error: msg });
  }

  try {
    const questionSetId = await questionService.createManualQuestionSet(
      validationResult.data,
      req.user.uid
    );
    res.status(200).json({ id: questionSetId });
  } catch (error) {
    sendError(res, error);
  }
}
