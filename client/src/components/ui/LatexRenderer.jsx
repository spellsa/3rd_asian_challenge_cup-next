import React, { useMemo, useContext, createContext } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem";
import "highlight.js/styles/github.css";
import "github-markdown-css/github-markdown.css";
import "./LatexRenderer.css";
import { parseFillInTheBlank } from "../../utils/quizUtils";

// --- マーカー定数 ---
// Markdownレンダリングを阻害せずに穴埋め入力欄を埋め込むためのアプローチ:
// 1. 前処理で穴埋め箇所を "@@BLANK_N@@" のようなプレースホルダー文字列に置換する
// 2. ReactMarkdownでレンダリングする（プレースホルダーはそのままテキストとして出力される）
// 3. レンダリング結果のReact要素ツリーを走査し、プレースホルダー文字列をinputコンポーネントに再置換する
const BLANK_PLACEHOLDER_PREFIX = "@@BLANK_";
const BLANK_PLACEHOLDER_SUFFIX = "@@";
const BLANK_PLACEHOLDER_SPLIT_REGEX = /(@@BLANK_\d+@@)/g;
const BLANK_PLACEHOLDER_CAPTURE_REGEX = /^@@BLANK_(\d+)@@$/;

const InlineParagraph = ({ children, className = "", ...props }) => (
  <span className={`latex-inline ${className}`.trim()} {...props}>
    {children}
  </span>
);

// --- コンテキスト ---
const LatexContext = createContext({});

// --- 穴埋め入力コンポーネント（メモ化） ---
const FillInTheBlankInput = React.memo(
  ({ id, value, onChange, disabled, isCorrect, modelAnswer }) => {
    let style = {
      display: "inline-block",
      margin: "0 4px",
      padding: "2px 4px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      minWidth: "40px",
      textAlign: "center",
    };

    if (disabled && isCorrect !== undefined) {
      if (isCorrect) {
        style.backgroundColor = "#d4edda"; // 正答時の背景色
        style.borderColor = "#c3e6cb";
      } else {
        style.backgroundColor = "#f8d7da"; // 誤答時の背景色
        style.borderColor = "#f5c6cb";
      }
    }

    return (
      <span
        className="fill-in-blank-container"
        style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}
      >
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange && onChange(id, e.target.value)}
          disabled={disabled}
          placeholder={`(${id + 1})`}
          style={style}
          autoComplete="off"
        />
        {disabled && !isCorrect && modelAnswer && (
          <span
            style={{ marginLeft: "4px", color: "#721c24", fontSize: "0.85em", fontWeight: "bold" }}
          >
            ({modelAnswer})
          </span>
        )}
      </span>
    );
  }
);

// --- 再帰置換のヘルパー関数 ---
const replaceTextRecursively = (node, contextData) => {
  const { inputs, onInputChange, disabled, results, modelAnswers } = contextData;

  // 1. 文字列の場合: 置換処理
  if (typeof node === "string") {
    // プレースホルダーが無ければ即返す
    if (!node.includes(BLANK_PLACEHOLDER_PREFIX)) return node;

    const parts = node.split(BLANK_PLACEHOLDER_SPLIT_REGEX);
    if (parts.length === 1) return node;

    return parts.map((part, i) => {
      const match = part.match(BLANK_PLACEHOLDER_CAPTURE_REGEX);
      if (match) {
        const id = parseInt(match[1], 10);
        return (
          <FillInTheBlankInput
            key={`blank-${id}`} // リストレンダリング用のkey
            id={id}
            value={inputs[id]}
            onChange={onInputChange}
            disabled={disabled}
            isCorrect={results ? results[id] : undefined}
            modelAnswer={modelAnswers ? modelAnswers[id] : undefined}
          />
        );
      }
      return part;
    });
  }

  // 2. 配列の場合: 各要素を再帰処理
  if (Array.isArray(node)) {
    return React.Children.map(node, (child) => replaceTextRecursively(child, contextData));
  }

  // 3. React要素の場合: childrenに再帰処理
  if (React.isValidElement(node)) {
    // childrenがある場合のみcloneして差し替える
    if (node.props.children) {
      return React.cloneElement(node, {
        ...node.props,
        children: replaceTextRecursively(node.props.children, contextData),
      });
    }
    return node;
  }

  return node;
};

// --- ヘルパー関数を用いたカスタムレンダラー生成 ---
// 任意のHTMLタグに対してテキスト置換ロジックを適用するラッパーを作成
const createRenderer = (Tag) => {
  return ({ children, ...props }) => {
    const contextData = useContext(LatexContext);
    return <Tag {...props}>{replaceTextRecursively(children, contextData)}</Tag>;
  };
};

// コードブロック用レンダラー
const CodeRenderer = ({ node, className, children, ...props }) => {
  const contextData = useContext(LatexContext);
  const processedChildren = replaceTextRecursively(children, contextData);

  return (
    <code className={className} {...props}>
      {processedChildren}
    </code>
  );
};

/**
 * LaTeXおよびMarkdownレンダラーコンポーネント
 *
 * 数式(KaTeX)、Markdown、および構文ハイライトをサポートします。
 * さらに、`parseFillInTheBlank` で抽出された穴埋め箇所を入力フォームに置換する機能も持ちます。
 *
 * @param {Object} props
 * @param {string} props.text - レンダリング対象のMarkdown/LaTeXテキスト
 * @param {Object} [props.inputs] - 穴埋め入力の値マップ { [index]: string }
 * @param {Function} [props.onInputChange] - 入力変更時のコールバック (index, value) => void
 * @param {boolean} [props.disabled] - 入力を無効化するかどうか
 * @param {Object} [props.results] - 採点結果マップ { [index]: boolean } (true=正解, false=不正解)
 * @param {Object} [props.modelAnswers] - 模範解答マップ { [index]: string } (不正解時に表示)
 * @param {boolean} [props.inline] - インライン表示モード (pタグで囲わずspanでレンダリング)
 */
const LatexRenderer = ({
  text,
  inputs = {},
  onInputChange,
  disabled = false,
  results = {},
  modelAnswers = {},
  inline = false,
}) => {
  // 1. 前処理 (shared logicを利用)
  const processedText = useMemo(() => {
    if (!text) return "";

    const tokens = parseFillInTheBlank(text);
    return tokens.map((t) => {
      if (t.type === "text") return t.content;
      // 穴埋め部分はプレースホルダーに置換
      return `${BLANK_PLACEHOLDER_PREFIX}${t.index}${BLANK_PLACEHOLDER_SUFFIX}`;
    }).join("");
  }, [text]);

  // 2. Context値
  const contextValue = useMemo(
    () => ({
      inputs,
      onInputChange,
      disabled,
      results,
      modelAnswers,
    }),
    [inputs, onInputChange, disabled, results, modelAnswers]
  );

  // 3. Components定義
  const blockComponents = useMemo(
    () => ({
      p: createRenderer("p"),
      li: createRenderer("li"),
      h1: createRenderer("h1"),
      h2: createRenderer("h2"),
      h3: createRenderer("h3"),
      h4: createRenderer("h4"),
      h5: createRenderer("h5"),
      h6: createRenderer("h6"),
      blockquote: createRenderer("blockquote"),
      td: createRenderer("td"),
      th: createRenderer("th"),
      code: CodeRenderer,
    }),
    []
  );

  const inlineComponents = useMemo(
    () => ({
      ...blockComponents,
      p: createRenderer(InlineParagraph),
    }),
    [blockComponents]
  );

  const rehypePlugins = useMemo(() => [rehypeKatex, rehypeHighlight], []);
  const remarkPlugins = useMemo(() => [remarkMath], []);

  const activeComponents = inline ? inlineComponents : blockComponents;

  const content = (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={activeComponents}
    >
      {processedText}
    </ReactMarkdown>
  );

  if (inline) {
    return <LatexContext.Provider value={contextValue}>{content}</LatexContext.Provider>;
  }

  return (
    <LatexContext.Provider value={contextValue}>
      <div
        className="markdown-body markdown-body--light"
        style={{ fontSize: "1rem", lineHeight: "1.6" }}
      >
        {content}
      </div>
    </LatexContext.Provider>
  );
};

export default React.memo(LatexRenderer);
