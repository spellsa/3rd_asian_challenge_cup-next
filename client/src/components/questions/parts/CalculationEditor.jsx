import React from "react";

/**
 * 計算問題エディタ
 *
 * 計算式(Formula)の入力と、変数の範囲(Variables)定義テーブルを提供します。
 *
 * @param {Object} props
 * @param {string} props.formula - 計算式 (例: "a + b")
 * @param {Array<{name: string, min: number, max: number, step: number}>} props.variables - 変数定義リスト
 * @param {Function} props.onChange - 更新時のコールバック ({ formula, variables }) => void
 * @param {boolean} [props.readOnly] - プレビュー用
 */
const CalculationEditor = ({
  formula,
  variables, // Array<{name, min, max, step}>
  onChange, // ({ formula, variables }) => void
  readOnly = false,
}) => {
  // Formula (計算式) の変更ハンドラ
  const handleFormulaChange = (val) => {
    onChange({ formula: val });
  };

  // 変数設定の変更ハンドラ
  // idx: 変更する変数のインデックス
  // field: 変数オブジェクトのプロパティ名 (name, min, max, step)
  // val: 新しい値
  const handleVariableChange = (idx, field, val) => {
    const newVars = [...(variables || [])];
    newVars[idx] = { ...newVars[idx], [field]: Number(val) };
    onChange({ variables: newVars });
  };

  return (
    <div className="form-group">
      <label>計算設定</label>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "0.9rem", color: "#555" }}>計算式 (Formula)</label>
        <input
          type="text"
          className="form-input"
          value={formula || ""}
          onChange={(e) => handleFormulaChange(e.target.value)}
          placeholder="例: a + b"
          readOnly={readOnly}
          style={readOnly ? { backgroundColor: "#f9f9f9", color: "#666" } : {}}
        />
        {!readOnly && (
          <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "4px" }}>
            ※ 変数は <code>{"{{var:変数名}}"}</code>{" "}
            として問題文で使用し、ここでは変数名のみ（例: a, b）を使用します。
          </p>
        )}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "0.9rem", color: "#555" }}>変数定義 (Variables)</label>
        {/* 変数エディタ: 変数の範囲(min/max)とステップ(step)を設定 */}
        <div className="variables-list">
          {!readOnly && (
            <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "8px" }}>
              ※ 変数は問題文から自動的に検出されます。
            </p>
          )}
          {/* ヘッダー行 */}
          <div
            className="variable-row header"
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "4px",
              fontSize: "0.8rem",
              color: "#666",
              fontWeight: "bold",
            }}
          >
            <span style={{ width: "80px", paddingLeft: "4px" }}>変数名</span>
            <span style={{ width: "60px", paddingLeft: "4px" }}>Min</span>
            <span>~</span>
            <span style={{ width: "60px", paddingLeft: "4px" }}>Max</span>
            <span style={{ width: "60px", paddingLeft: "4px" }}>Step</span>
          </div>
          {(Array.isArray(variables) ? variables : []).map((v, idx) => (
            <div
              key={idx}
              className="variable-row"
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "8px",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={v.name}
                readOnly
                style={{
                  width: "80px",
                  padding: "4px",
                  backgroundColor: "#f0f0f0",
                  border: "1px solid #ddd",
                  color: "#555",
                }}
              />
              <input
                type="number"
                placeholder="Min"
                value={v.min}
                onChange={(e) => handleVariableChange(idx, "min", e.target.value)}
                readOnly={readOnly}
                style={{
                  width: "60px",
                  padding: "4px",
                  ...(readOnly ? { backgroundColor: "#f9f9f9", color: "#666" } : {})
                }}
              />
              <span>~</span>
              <input
                type="number"
                placeholder="Max"
                value={v.max}
                onChange={(e) => handleVariableChange(idx, "max", e.target.value)}
                readOnly={readOnly}
                style={{
                  width: "60px",
                  padding: "4px",
                  ...(readOnly ? { backgroundColor: "#f9f9f9", color: "#666" } : {})
                }}
              />
              <input
                type="number"
                placeholder="Step"
                value={v.step}
                onChange={(e) => handleVariableChange(idx, "step", e.target.value)}
                readOnly={readOnly}
                style={{
                  width: "60px",
                  padding: "4px",
                  ...(readOnly ? { backgroundColor: "#f9f9f9", color: "#666" } : {})
                }}
              />
            </div>
          ))}
          {(Array.isArray(variables) ? variables : []).length === 0 && (
            <div
              style={{
                fontSize: "0.85rem",
                color: "#999",
                fontStyle: "italic",
                padding: "8px",
              }}
            >
              {readOnly
                ? "変数は定義されていません"
                : <span>問題文に <code>{"{{var:変数名}}"}</code> を記述すると、ここに設定が表示されます。</span>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalculationEditor;
