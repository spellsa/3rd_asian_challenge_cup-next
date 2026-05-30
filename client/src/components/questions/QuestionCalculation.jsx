import React, { useState, useEffect, useRef } from "react";
import { evaluate, randomInt } from "mathjs";
import LatexRenderer from "../ui/LatexRenderer";
import { MdDelete } from "react-icons/md";
import { CALCULATION_VARIABLE_REGEX, applyVariables } from "../../utils/quizUtils";
import "./QuestionCalculation.css";

function QuestionCalculation({ index, question, answer, onAnswer }) {
  const [generatedData, setGeneratedData] = useState(null);
  const [input, setInput] = useState("");
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // 既に生成データがanswerに存在する場合は復元する
    if (answer && typeof answer === "object" && answer.generatedQuestion) {
      if (!generatedData) {
        setGeneratedData({
          questionText: answer.generatedQuestion,
          correctAnswer: answer.calculatedAnswer,
          scope: answer.scope,
        });
        setInput(answer.userAnswer || "");
      }
      return;
    }

    // 既に初期化済みの場合は再初期化を防ぐ
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // 変数 {{var:name}} をパースする
    const regex = new RegExp(CALCULATION_VARIABLE_REGEX);
    let match;
    const variables = new Set();
    // 正規表現のlastIndexをリセット
    regex.lastIndex = 0;
    while ((match = regex.exec(question.question)) !== null) {
      variables.add(match[1]);
    }

    const scope = {};

    const getVariableConfig = (variableName) => {
      if (!question.variables) return null;
      if (Array.isArray(question.variables)) {
        return question.variables.find((item) => item.name === variableName) || null;
      }
      return question.variables[variableName] || null;
    };

    const generateRandomValue = (config) => {
      const min = config?.min !== undefined ? Number(config.min) : 1;
      const max = config?.max !== undefined ? Number(config.max) : 20;
      const step = config?.step !== undefined ? Number(config.step) : null;

      if (step && step > 0) {
        const steps = Math.floor((max - min) / step + 1e-9);
        const idx = randomInt(0, steps + 1);
        const value = min + idx * step;
        return Number(value.toFixed(10));
      }

      if (Number.isInteger(min) && Number.isInteger(max)) {
        return randomInt(min, max + 1);
      }

      const value = Math.random() * (max - min) + min;
      return Number(value.toFixed(10));
    };

    variables.forEach((variableName) => {
      const varConfig = getVariableConfig(variableName);
      scope[variableName] = generateRandomValue(varConfig);
    });

    // 問題文内の変数を置換する (applyVariablesを使用)
    const questionText = applyVariables(question.question, scope);

    // 答えを計算する
    let calculated = "";
    try {
      let formula = question.formula || question.correctAnswer || "";
      // 式から {{var: と }} を削除して生の変数名を取得
      formula = formula.replace(new RegExp(CALCULATION_VARIABLE_REGEX), "$1");

      if (formula) {
        calculated = evaluate(formula, scope);
      }
    } catch (e) {
      console.error("計算エラー", e);
      calculated = "Error";
    }

    const data = {
      questionText,
      correctAnswer: calculated,
      scope,
    };
    setGeneratedData(data);

    // 初期状態を親に保存
    onAnswer(index, {
      userAnswer: "",
      generatedQuestion: questionText,
      calculatedAnswer: calculated,
      scope,
    });
    // 問題IDが変わった時のみ再実行（無限ループを防ぐため依存配列を限定）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.questionId]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (generatedData) {
      onAnswer(index, {
        userAnswer: val,
        generatedQuestion: generatedData.questionText,
        calculatedAnswer: generatedData.correctAnswer,
        scope: generatedData.scope,
      });
    }
  };

  const handleClear = () => {
    setInput("");
    if (generatedData) {
      onAnswer(index, {
        userAnswer: "",
        generatedQuestion: generatedData.questionText,
        calculatedAnswer: generatedData.correctAnswer,
        scope: generatedData.scope,
      });
    }
  };

  if (!generatedData) return <div className="calculation-loading">Loading...</div>;

  return (
    <div className="QuestionCalculation">
      <h3 className="QuestionCalculationTitle">
        <div className="QuestionCalculationNumber">
          <span>問題{index + 1}</span>
          <button onClick={handleClear} className="ResetCalculation">
            <MdDelete size={20} />
          </button>
        </div>
        <div className="QuestionCalculationText">
          <LatexRenderer text={generatedData.questionText} />
        </div>
      </h3>
      {question.imageUrl && (
        <div
          className="question-image-container"
          style={{ textAlign: "center", marginBottom: "15px" }}
        >
          <img
            src={question.imageUrl}
            alt={`Question ${index + 1}`}
            loading="lazy"
            style={{
              maxWidth: "100%",
              maxHeight: "300px",
              objectFit: "contain",
              borderRadius: "8px",
            }}
          />
        </div>
      )}
      <div className="QuestionCalculationForm">
        <div className="formExplain">計算結果を入力してください</div>
        <span>
          回答:
          <input
            type="text"
            className="EnteringCalculation"
            value={input}
            onChange={handleChange}
            placeholder="答えを入力"
          />
        </span>
      </div>
    </div>
  );
}

export default QuestionCalculation;
