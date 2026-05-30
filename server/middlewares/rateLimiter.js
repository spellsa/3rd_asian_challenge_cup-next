import rateLimit from "express-rate-limit";

const RATE_LIMIT_CONFIG = {
  generateQuestionSets: {
    shortTerm: { windowMs: 60 * 60 * 1000, max: 10 },
    longTerm: { windowMs: 24 * 60 * 60 * 1000, max: 20 }, // 24時間で20回
  },
  gradeFreeText: {
    shortTerm: { windowMs: 60 * 60 * 1000, max: 30 },
    longTerm: { windowMs: 24 * 60 * 60 * 1000, max: 100 }, // 24時間で100回
  },
};

const keyGenerator = (req) => req.user.uid;

export const generateQuestionSetsLimiterShortTerm = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.generateQuestionSets.shortTerm.windowMs,
  max: RATE_LIMIT_CONFIG.generateQuestionSets.shortTerm.max,
  keyGenerator,
  message: "問題セットの生成回数が短期間で多すぎます。しばらくしてから再度お試しください。",
});

export const generateQuestionSetsLimiterLongTerm = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.generateQuestionSets.longTerm.windowMs,
  max: RATE_LIMIT_CONFIG.generateQuestionSets.longTerm.max,
  keyGenerator,
  message: "本日の制限回数を超えました。24時間後に再度お試しください。",
});

export const gradeFreeTextLimiterShortTerm = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.gradeFreeText.shortTerm.windowMs,
  max: RATE_LIMIT_CONFIG.gradeFreeText.shortTerm.max,
  keyGenerator,
  message: "自由記述の採点回数が短期間で多すぎます。しばらくしてから再度お試しください。",
});

export const gradeFreeTextLimiterLongTerm = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.gradeFreeText.longTerm.windowMs,
  max: RATE_LIMIT_CONFIG.gradeFreeText.longTerm.max,
  keyGenerator,
  message: "本日の制限回数を超えました。24時間後に再度お試しください。",
});
