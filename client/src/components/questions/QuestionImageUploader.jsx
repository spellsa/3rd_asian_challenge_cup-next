import React from "react";
import { MdImage, MdDelete } from "react-icons/md";

const QuestionImageUploader = ({ imageUrl, onUpload, onDelete, isUploading }) => {
  return (
    <div className="form-group">
      <label>画像 (オプション)</label>
      <div className="image-upload-container">
        {imageUrl ? (
          <div className="image-preview-wrapper">
            <img src={imageUrl} alt="Question" className="question-image-preview" />
            <button className="btn-delete-image" onClick={onDelete}>
              <MdDelete /> 削除
            </button>
          </div>
        ) : (
          <div className="image-upload-controls">
            <label className="btn-upload-image">
              <MdImage /> 画像を選択
              <input
                type="file"
                accept="image/*"
                onChange={onUpload}
                disabled={isUploading}
                hidden
              />
            </label>
            {isUploading && <span className="uploading-text">アップロード中...</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionImageUploader;
