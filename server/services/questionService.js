// 問題セットの生成・保存・更新・削除を担うサービス層
import { db } from "../firebase/firebase.js";
import crypto from "crypto";
import {
  downloadFileAndUploadToGemini,
  deleteFile,
  deleteImageFromStorage,
} from "../utils/fileUtils.js";
import {
  uploadFileToGemini,
  generateQuestionSetWithGemini,
  generateQuestionSetWithPrompt,
} from "./geminiService.js";

// ファイル/プロンプト入力をもとに問題セットを生成しDBへ保存する
export async function handleGenerateQuestionSetRequest(params, userId) {
  const { downloadURLs, prompt, questionCount, formats, subjectName } = params;
  let generatedQuestionSet;
  let tempFilePaths = [];

  try {
    if (downloadURLs && downloadURLs.length > 0) {
      // ファイルベースの生成
      const { uploadedFiles, tempFilePaths: tempPaths } = await downloadFileAndUploadToGemini(
        downloadURLs,
        uploadFileToGemini
      );
      tempFilePaths = tempPaths;
      generatedQuestionSet = await generateQuestionSetWithGemini(
        uploadedFiles,
        prompt,
        questionCount,
        formats
      );
    } else if (prompt) {
      // プロンプトベースの生成
      generatedQuestionSet = await generateQuestionSetWithPrompt(prompt, questionCount, formats);
    } else {
      throw new Error("downloadURLs または prompt のいずれかが必要です。");
    }

    // 生成された問題セットに対して、IDやユーザーID、作成日時を付与
    const formattedQuestionSet = await formatQuestionSet(generatedQuestionSet, subjectName, userId);

    // データベースに保存
    const questionSetId = await saveQuestionSetToDatabase(formattedQuestionSet);

    return questionSetId; // 生成された問題セットを返す
  } finally {
    // 一時ファイルを削除（ファイルがあった場合のみ）
    if (tempFilePaths.length > 0) {
      await deleteFile(tempFilePaths);
    }
  }
}

// Geminiからのレスポンスに対して、問題IDやユーザーID、作成日時を付与する
export async function formatQuestionSet(json, subjectName, userId) {
  json.createdUserId = userId; // ユーザーIDを付与
  json.createdAt = new Date().toISOString(); // 現在の日時をISO形式で付与
  json.subjectName = subjectName ?? "None"; // 科目名を付与

  json.questions = json.questions.map((question) => {
    const formatted = { ...question, questionId: crypto.randomUUID() };

    // fill_in_the_blank: モデルから余分なanswerが来た場合は破棄
    if (formatted.questionType === "fill_in_the_blank") {
      delete formatted.answer;
    }

    // calculation: answerはサーバー側で付与するためnullで初期化
    if (formatted.questionType === "calculation") {
      formatted.answer = null;
    }

    return formatted;
  });

  return json;
}

// 生成された問題セットをデータベースに保存
export async function saveQuestionSetToDatabase(questionSet) {
  // データベースに問題セットを保存する処理
  const questionSetRef = await db.collection("questionSets").add(questionSet);
  console.log("問題セットをデータベースに保存しました:", questionSetRef.id);
  return questionSetRef.id; // 保存した問題セットのIDを返す
}

// ユーザーの回答ログから不正解の問題の詳細を取得
async function getIncorrectAnswerDetails(answerLogId, userId) {
  // console.log("ユーザーの回答ログから不正解の問題の詳細を取得します。", answerLogId);
  const answerLogRef = db.collection("users").doc(userId).collection("answerLogs").doc(answerLogId);
  const answerLogDoc = await answerLogRef.get();

  if (!answerLogDoc.exists) {
    throw new Error("指定された回答ログが存在しません。");
  }

  const logData = answerLogDoc.data();
  if (!logData.incorrectAnswerDetails || !Array.isArray(logData.incorrectAnswerDetails)) {
    throw new Error("不正解の問題の詳細が見つかりません。");
  }

  return logData.incorrectAnswerDetails; // 不正解の問題の詳細を返す
}

// 間違えた問題セット群から問題セットIDと該当問題を抽出
export async function createResponseArray(incorrectAnswerLogs) {
  const results = [];
  for (const log of incorrectAnswerLogs) {
    // IDをもとにして間違えた問題の問題セットを取得
    const questionSetRef = db.collection("questionSets").doc(log.questionSetId);
    const questionSetDoc = await questionSetRef.get(); // 間違えた問題を含む問題セットを取得

    // 問題セットが存在する場合
    if (questionSetDoc.exists) {
      for (const questionId of log.incorrectQuestionIds) {
        // 問題セットの中から、間違えた問題のIDを持つ問題を探す
        const question = questionSetDoc.data().questions.find((q) => q.questionId === questionId);
        if (question) {
          let slicedQuestionText = "";

          if (Array.isArray(question.question)) {
            // question.questionが配列の場合
            const joinedQuestionText = question.question.join("___"); // 配列をスペースで結合
            slicedQuestionText = joinedQuestionText.slice(0, 10); // 最初の10文字を取得
          } else if (typeof question.question === "string") {
            // question.questionが文字列の場合
            slicedQuestionText = question.question.slice(0, 10); // 最初の10文字を取得
          }
          results.push({
            questionSetId: log.questionSetId,
            questionId: question.questionId,
            questionText: slicedQuestionText, // 問題文を追加
          });
        }
      }
    }
  }
  return results;
}

export async function updateQuestionSetInDatabase(questionSetId, userId, updateData) {
  const docRef = db.collection("questionSets").doc(questionSetId);
  const doc = await docRef.get();

  if (!doc.exists) {
    const error = new Error("指定された問題セットが見つかりません。");
    error.statusCode = 404;
    throw error;
  }

  const data = doc.data();
  if (data.createdUserId !== userId) {
    const error = new Error("この問題セットを編集する権限がありません。");
    error.statusCode = 403;
    throw error;
  }

  await docRef.update({
    ...updateData,
    updatedAt: new Date().toISOString(),
  });

  return questionSetId;
}

export async function deleteQuestionSetFromDatabase(questionSetId, userId) {
  const docRef = db.collection("questionSets").doc(questionSetId);
  const doc = await docRef.get();

  if (!doc.exists) {
    const error = new Error("指定された問題セットが見つかりません。");
    error.statusCode = 404;
    throw error;
  }

  const data = doc.data();
  if (data.createdUserId !== userId) {
    const error = new Error("この問題セットを削除する権限がありません。");
    error.statusCode = 403;
    throw error;
  }

  // 画像の削除処理
  if (data.questions && Array.isArray(data.questions)) {
    const imageUrls = new Set();

    // 再帰的にオブジェクトを探索して画像URLを収集する関数
    const collectImageUrls = (obj) => {
      if (!obj || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        obj.forEach(collectImageUrls);
        return;
      }

      // imageUrlプロパティがあれば追加
      if (
        obj.imageUrl &&
        typeof obj.imageUrl === "string" &&
        obj.imageUrl.includes("firebasestorage.googleapis.com")
      ) {
        imageUrls.add(obj.imageUrl);
      }

      // questionプロパティ（Markdown）内の画像リンクを抽出
      if (obj.question && typeof obj.question === "string") {
        const regex = /!\[.*?\]\((https:\/\/firebasestorage\.googleapis\.com\/.*?)\)/g;
        let match;
        while ((match = regex.exec(obj.question)) !== null) {
          imageUrls.add(match[1]);
        }
      }

      // 他のプロパティも再帰的に探索
      Object.values(obj).forEach(collectImageUrls);
    };

    collectImageUrls(data.questions);

    // 画像を削除
    if (imageUrls.size > 0) {
      console.log(`削除対象の画像数: ${imageUrls.size}`);
      for (const url of imageUrls) {
        await deleteImageFromStorage(url);
      }
    }
  }

  await docRef.delete();
  return questionSetId;
}

export async function createManualQuestionSet(questionSetData, userId) {
  const formattedQuestionSet = {
    ...questionSetData,
    createdUserId: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return await saveQuestionSetToDatabase(formattedQuestionSet);
}
