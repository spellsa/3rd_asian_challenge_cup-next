// ファイルの一時保存・Geminiアップロード・ストレージ削除を扱うユーティリティ
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { createPartFromUri } from "@google/genai";
import { storage } from "../firebase/firebase.js";

const TEMP_DIR = "./tempFiles";
const SUPPORTED_FILE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".pdf", ".txt"]);

// Firebase Storage の公開URLからローカル temp に保存しtempパスを返す（SSRF対策でドメインを限定）
export async function downloadFileFromURL(downloadURL) {
  const urlObj = new URL(downloadURL);

  // 外部呼び出しの出口を固定し、内部ネットワークへの到達を防ぐ
  const ALLOWED_DOMAINS = ["firebasestorage.googleapis.com"];
  if (!ALLOWED_DOMAINS.includes(urlObj.hostname)) {
    throw new Error("許可されていないドメインからのダウンロードです。");
  }

  const pathParam = urlObj.pathname.split("/o/")[1];
  if (!pathParam) {
    throw new Error("無効なFirebase Storage URLです。");
  }

  const decodedPath = decodeURIComponent(pathParam);
  const originalFileName = decodedPath.split("/").pop() ?? "";
  const fileExtension = path.extname(originalFileName).toLowerCase();
  if (!SUPPORTED_FILE_EXTENSIONS.has(fileExtension)) {
    throw new Error(`サポートされていないファイル形式です: ${fileExtension}`);
  }

  await fs.mkdir(TEMP_DIR, { recursive: true });
  const destinationPath = path.join(TEMP_DIR, `${randomUUID()}${fileExtension}`);

  const fetchResponse = await fetch(downloadURL);
  if (!fetchResponse.ok) {
    throw new Error(`ファイルのダウンロードに失敗しました: ${fetchResponse.statusText}`);
  }
  const buffer = await fetchResponse.arrayBuffer();
  await fs.writeFile(destinationPath, Buffer.from(buffer));
  console.log("ファイルをダウンロードしました:", destinationPath);
  return destinationPath;
}

// 一時ファイルの削除（失敗しても処理継続）
export async function deleteFile(filePaths) {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
      console.log(`ファイルを削除しました: ${filePath}`);
    } catch (error) {
      console.error(`ファイルの削除に失敗しました: ${filePath}`, error);
    }
  }
}

// 複数URLを一括ダウンロードし、そのまま Gemini にアップロードする
export async function downloadFileAndUploadToGemini(downloadURLs, uploadFileToGemini) {
  const uploadedFiles = [];
  const tempFilePaths = [];

  for (const downloadURL of downloadURLs) {
    const filePath = await downloadFileFromURL(downloadURL);
    tempFilePaths.push(filePath);
    const uploadedFile = await uploadFileToGemini(filePath);
    uploadedFiles.push(createPartFromUri(uploadedFile.uri, uploadedFile.mimeType));
  }
  return { uploadedFiles, tempFilePaths };
}

// Firebase Storage 上の画像を削除（存在しない場合はスキップ）
export async function deleteImageFromStorage(imageUrl) {
  if (!imageUrl) return;

  try {
    const urlObj = new URL(imageUrl);
    const pathParam = urlObj.pathname.split("/o/")[1];
    if (!pathParam) {
      console.warn("無効なFirebase Storage URLです:", imageUrl);
      return;
    }

    const decodedPath = decodeURIComponent(pathParam);
    const bucket = storage.bucket();
    const file = bucket.file(decodedPath);

    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      console.log(`Firebase Storageから画像を削除しました: ${decodedPath}`);
    } else {
      console.log(`画像が見つかりませんでした (削除スキップ): ${decodedPath}`);
    }
  } catch (error) {
    console.error(`画像の削除に失敗しました: ${imageUrl}`, error);
    // 画像削除の失敗はメイン処理を中断させないため、エラーを投げない
  }
}
