import React from "react";
import LatexRenderer from "../../ui/LatexRenderer";
import OptionsEditor from "./OptionsEditor";

/**
 * 並び替え問題エディタ
 *
 * 選択肢の追加・削除と、正解の順序（シーケンス）を定義するUIを提供します。
 * `OptionsEditor` を内部で使用して選択肢リストの管理を行い、
 * 独自のUIで正解順序の定義を行います。
 *
 * @param {Object} props
 * @param {string[]} props.options - 選択肢の配列
 * @param {string} props.correctAnswer - 正解の順序を表すスペース区切り文字列 (例: "Item1 Item2")
 * @param {Function} props.onChange - 更新時のコールバック ({ options, correctAnswer }) => void
 * @param {boolean} [props.readOnly] - プレビュー用
 */
const OrderingEditor = ({
  options,
  correctAnswer, // "Item1 Item2 ..." string
  onChange, // ({ options, correctAnswer }) => void
  readOnly = false,
}) => {
  // 並び替えの順番配列 (文字列配列)
  const orderingAnswer = correctAnswer ? correctAnswer.split(" ") : [];

  const handleOptionsChange = (updates) => {
    // 選択肢の文言が変更された場合に、正解データ（orderingAnswer）に含まれる
    // 該当の文言も同時に更新するロジック。
    // options: 変更前の選択肢リスト
    // newOptions: 変更後の選択肢リスト

    const newOptions = updates.options;
    let newOrderingAnswer = [...orderingAnswer];

    // 単純に、文言が変わった箇所を探す
    if (options && newOptions && options.length === newOptions.length) {
      options.forEach((oldVal, idx) => {
        const newVal = newOptions[idx];
        if (oldVal !== newVal) {
          // 正解配列(orderingAnswer)の中に古い文言が含まれていれば、新しい文言に置換する
          newOrderingAnswer = newOrderingAnswer.map(ans => ans === oldVal ? newVal : ans);
        }
      });
    } else {
      // 選択肢の追加や削除が行われた場合の処理
      // 削除された選択肢は、正解データからも削除する必要がある
      if (options && newOptions && newOptions.length < options.length) {
        // 削除された項目を特定
        const deleted = options.filter(o => !newOptions.includes(o));
        deleted.forEach(d => {
          newOrderingAnswer = newOrderingAnswer.filter(ans => ans !== d);
        });
      }
    }

    onChange({
      options: newOptions,
      correctAnswer: newOrderingAnswer.join(" ")
    });
  };

  const addToOrderingAnswer = (option) => {
    if (readOnly) return;
    const newAnswer = [...orderingAnswer, option];
    onChange({ options, correctAnswer: newAnswer.join(" ") });
  };

  const removeFromOrderingAnswer = (idx) => {
    if (readOnly) return;
    const newAnswer = orderingAnswer.filter((_, i) => i !== idx);
    onChange({ options, correctAnswer: newAnswer.join(" ") });
  };

  const clearOrderingAnswer = () => {
    if (readOnly) return;
    onChange({ options, correctAnswer: "" });
  };

  return (
    <>
      {/*
         OptionsEditorはリスト編集UIとして再利用する。
         questionType="ordering" を渡すことで、OptionsEditor内部では
         options配列の更新のみを行い、correctAnswer/answerの自動同期ロジックはスキップさせる。
       */}
      <OptionsEditor
        questionType="ordering"
        options={options}
        onChange={handleOptionsChange}
        readOnly={readOnly}
      />

      <div
        className="form-group"
        style={{ marginTop: "1.5rem", borderTop: "1px dashed #eee", paddingTop: "1rem" }}
      >
        <label>正解の並び順を設定 {readOnly ? "(プレビュー)" : "(下の選択肢をクリックして並べてください)"}</label>

        {/* 正解シーケンス */}
        <div className="ordering-answer-box">
          {orderingAnswer.length === 0 && (
            <span style={{ color: "#999" }}>
              {readOnly ? "正解が設定されていません" : "選択肢をクリックして正解を作成してください"}
            </span>
          )}
          {orderingAnswer.map((ans, idx) => (
            <button
              key={idx}
              className="tile-small"
              onClick={() => removeFromOrderingAnswer(idx)}
              disabled={readOnly}
              style={readOnly ? { cursor: "default" } : {}}
            >
              <LatexRenderer text={ans} />
            </button>
          ))}
        </div>

        {!readOnly && (
          <button
            onClick={clearOrderingAnswer}
            style={{
              fontSize: "0.8rem",
              color: "#666",
              background: "none",
              border: "none",
              cursor: "pointer",
              marginTop: "5px",
            }}
          >
            リセット
          </button>
        )}

        {/* 選択可能なオプション一覧 (ソース) */}
        {!readOnly && (
          <div className="ordering-source-box">
            <p style={{ fontSize: "0.9rem", marginBottom: "5px" }}>選択肢一覧:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {options &&
                options.map((opt, i) => (
                  <button
                    key={i}
                    className="tile-source"
                    onClick={() => addToOrderingAnswer(opt)}
                  >
                    <LatexRenderer text={opt} />
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OrderingEditor;
