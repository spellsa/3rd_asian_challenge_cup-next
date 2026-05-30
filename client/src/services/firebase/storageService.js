import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import imageCompression from "browser-image-compression";

export const storageService = {
  uploadFilesToStorage: async (files) => {
    const downloadURLs = [];
    for (const file of files) {
      const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      downloadURLs.push(url);
    }
    return downloadURLs;
  },

  uploadQuizImage: async (file, userId, quizId, questionId) => {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      const storageRef = ref(storage, `quiz-images/${userId}/${quizId}/${questionId}.jpg`);
      await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  },

  deleteQuizImage: async (userId, quizId, questionId) => {
    try {
      const storageRef = ref(storage, `quiz-images/${userId}/${quizId}/${questionId}.jpg`);
      await deleteObject(storageRef);
    } catch (error) {
      console.warn("Error deleting image (might not exist):", error);
    }
  },

  deleteQuizImages: async (userId, quizId) => {
    try {
      const folderRef = ref(storage, `quiz-images/${userId}/${quizId}`);
      const listResult = await listAll(folderRef);
      const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error deleting quiz images:", error);
    }
  },
};
