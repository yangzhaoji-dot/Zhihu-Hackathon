import type { Explorer } from "./types";

// A small pool of fellow explorers with distinct, self-consistent stance
// profiles across the eight core opinions. In the shipping demo this stands in
// for a real community; swapping it for live users (keyed by account) requires
// no change to the matching API surface — the matcher only reads `agree` /
// `disagree` / `leaning`.
//
// Opinion ids for reference:
//   o_stoploss  裸辞能止损，别把身心耗在坏环境   (止损派)
//   o_cashflow  没现金流就裸辞，焦虑只会换个形式 (稳健派)
//   o_inwork    先用在职窗口验证下一份机会       (稳健派)
//   o_transform 裸辞适合需要深度转型的人         (止损派)
//   o_legal     公司违法不该由个人辞职来解决     (维权派)
//   o_inner     不解决内在焦虑，换环境也没用     (维权派/内省)
//   o_window    手握 near-offer 时裸辞风险很小   (稳健派)
//   o_threshold 关键不是裸辞，而是退出成本可控   (中间/整合)

export const EXPLORERS: Explorer[] = [
  {
    id: "ex_yehang",
    name: "@夜航西飞",
    tagline: "三次裸辞，两次转行，只信「熬不下去就走」",
    leaning: "止损派",
    agree: ["o_stoploss", "o_transform"],
    disagree: ["o_cashflow", "o_inwork"],
  },
  {
    id: "ex_suanzhang",
    name: "@算账的老王",
    tagline: "现金流至上，任何决定先看能撑几个月",
    leaning: "稳健派",
    agree: ["o_cashflow", "o_inwork", "o_window"],
    disagree: ["o_stoploss"],
  },
  {
    id: "ex_weiquan",
    name: "@不忍了小周",
    tagline: "遇到违法公司，走不是认输，是维权第一步",
    leaning: "维权派",
    agree: ["o_legal", "o_stoploss"],
    disagree: ["o_inwork"],
  },
  {
    id: "ex_neixing",
    name: "@向内看",
    tagline: "换了三份工作才懂：问题常常在自己心里",
    leaning: "维权派",
    agree: ["o_inner", "o_threshold"],
    disagree: ["o_stoploss", "o_transform"],
  },
  {
    id: "ex_zhenghe",
    name: "@中间地带",
    tagline: "不站队，只问：退出成本你算清楚了吗",
    leaning: "中间派",
    agree: ["o_threshold", "o_window", "o_cashflow"],
    disagree: [],
  },
  {
    id: "ex_zhuanxing",
    name: "@转身向阳",
    tagline: "深度转型必须破釜沉舟，骑驴找马转不成",
    leaning: "止损派",
    agree: ["o_transform", "o_stoploss"],
    disagree: ["o_inwork", "o_window"],
  },
];
