// ユーザーの回答ログ保存やマイページ用データ取得を扱うサービス層
import { db } from "../firebase/firebase.js";
import { createResponseArray } from "./questionService.js";

// ユーザーの回答ログを保存する関数
export async function saveUserAnswerLog(userId, logData) {
  // ユーザーの回答ログをFirestoreに保存
  const answerLogRef = await db
    .collection("users")
    .doc(userId)
    .collection("answerLogs")
    .add(logData);
  // console.log("ユーザーの回答ログを保存しました:", answerLogRef.id);
  return answerLogRef.id;
}

// ユーザーが最近解いた問題を取得する関数
export async function getRecentlyAnsweredQuestionSets(userId) {
  let rawSetIdLogs = [];
  // ログからユーザーが最近解いた問題のIDを取得
  const logsSnapshot = await db
    .collection("users")
    .doc(userId)
    .collection("answerLogs")
    .orderBy("answeredAt", "desc") // answeredAtで降順にソート
    .limit(20) // 最近解いた問題を20件取得
    .get();
  if (logsSnapshot) {
    rawSetIdLogs = logsSnapshot.docs.map((doc) => ({
      questionSetId: doc.data().questionSetId,
    }));
  }
  const uniqueSetIds = []; // 重複しない問題セットIDの配列（最大数6）
  for (const setId of rawSetIdLogs) {
    if (!uniqueSetIds.includes(setId.questionSetId) && uniqueSetIds.length < 6) {
      // 重複しないIDを追加
      uniqueSetIds.push(setId.questionSetId);
    }
  }
  // console.log("最近解いた問題のID:", uniqueSetIds);

  let results = [];
  if (uniqueSetIds.length > 0) {
    for (const setId of uniqueSetIds) {
      // IDをもとにして問題セットのタイトルを取得
      const questionSetRef = db.collection("questionSets").doc(setId);
      const questionSetDoc = await questionSetRef.get(); // 問題セットを取得

      // 問題セットが存在する場合
      if (questionSetDoc.exists) {
        results.push({
          id: questionSetDoc.id,
          title: questionSetDoc.data().title,
        });
      }
    }
  }
  return results;
}

// ユーザーが最近間違えた問題を取得する関数
export async function getRecentlyIncorrectQuestionSets(userId) {
  // ログからユーザーが最近解いた問題のIDを取得
  const logsSnapshot = await db
    .collection("users")
    .doc(userId)
    .collection("answerLogs")
    .orderBy("answeredAt", "desc") // answeredAtで降順にソート
    .where("incorrectQuestionIds", "!=", []) // 不正解の問題があるものをフィルタリング
    .limit(6) // 最近解いた問題を6件取得
    .get();

  // 問題セットIDと不正解の問題IDの配列を作成
  //[["問題セットID", <不正解の問題IDの配列>],...]の形式
  const incorrectAnswerLogs = logsSnapshot.docs.map((doc) => ({
    questionSetId: doc.data().questionSetId,
    incorrectQuestionIds: doc.data().incorrectQuestionIds,
  }));
  const results = await createResponseArray(incorrectAnswerLogs); // レスポンスの配列を作成
  return results;
}

// 自分の作成した問題セットを取得する関数
export async function getMyQuestionSets(userId) {
  let results = [];
  // questionSetsコレクションから、ユーザーが作成した問題セットのIDを取得
  const questionSetsSnapshot = await db
    .collection("questionSets")
    .where("createdUserId", "==", userId) // createdUserIdがuidと一致するドキュメントを取得
    .orderBy("createdAt", "desc") // 作成日時で降順にソート
    .get();

  if (questionSetsSnapshot) {
    results = questionSetsSnapshot.docs.map((doc) => ({
      questionSetId: doc.id,
      title: doc.data().title,
    }));
  }
  return results;
}
