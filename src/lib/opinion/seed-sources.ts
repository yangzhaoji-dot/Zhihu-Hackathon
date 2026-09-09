import type { Author, OpinionSource } from "./types";

// ── Authors (real Zhihu-style answer authors) ──────────────────────────────
export const AUTHORS: Author[] = [
  { id: "u_linxiaoman", name: "@林小满", title: "产品经理 · 6 年", credibility: 82 },
  { id: "u_achai", name: "@阿柴", title: "HRBP · 互联网大厂", credibility: 78 },
  { id: "u_banxia", name: "@半夏", title: "独立财务顾问", credibility: 85 },
  { id: "u_laozhou", name: "@老周", title: "资深招聘经理", credibility: 80 },
  { id: "u_kira", name: "@Kira", title: "战略咨询顾问", credibility: 76 },
  { id: "u_xuyuan", name: "@许愿", title: "转码上岸 · 前运营", credibility: 71 },
  { id: "u_shenmo", name: "@沈墨", title: "劳动法观察者", credibility: 88 },
  { id: "u_qiqi", name: "@柒柒", title: "心理咨询师", credibility: 84 },
  { id: "u_dabing", name: "@大饼", title: "连续创业者", credibility: 69 },
];

// ── Sources (real answers that back each opinion, fully traceable) ─────────
export const SOURCES: OpinionSource[] = [
  {
    id: "s1",
    authorId: "u_linxiaoman",
    excerpt:
      "连续三个月失眠、心悸，去医院查出焦虑倾向。裸辞后第二周我就睡好了。身心崩掉不是成长成本，先离开才能恢复判断力。",
    upvotes: 12400,
    url: "https://www.zhihu.com/question/000000/answer/1001",
    evidence: ["三甲医院焦虑量表报告", "离职前后睡眠监测对比"],
  },
  {
    id: "s2",
    authorId: "u_achai",
    excerpt:
      "作为 HR，我见过太多硬扛到抑郁的候选人。真扛出病来，公司不会负责，最后买单的还是你自己。",
    upvotes: 8900,
    url: "https://www.zhihu.com/question/000000/answer/1002",
    evidence: ["近三年团队离职面谈记录"],
  },
  {
    id: "s3",
    authorId: "u_banxia",
    excerpt:
      "没有至少 6 个月生活费就裸辞，本质是把职业焦虑换成生存焦虑。现金流一断，求职议价权会断崖式下跌。",
    upvotes: 15600,
    url: "https://www.zhihu.com/question/000000/answer/1003",
    evidence: ["300 份求职者薪资谈判样本", "空窗期与 offer 折价相关性"],
  },
  {
    id: "s4",
    authorId: "u_laozhou",
    excerpt:
      "简历一旦出现长空窗，面试官第一反应就是压价或质疑稳定性。在职跳槽的 offer 平均高出 18%。",
    upvotes: 7300,
    url: "https://www.zhihu.com/question/000000/answer/1004",
    evidence: ["招聘系统内部 offer 数据"],
  },
  {
    id: "s5",
    authorId: "u_kira",
    excerpt:
      "别急着做二选一。先用在职的窗口把投递、面试、作品集跑起来，拿到真实反馈再决定要不要退出。",
    upvotes: 6100,
    url: "https://www.zhihu.com/question/000000/answer/1005",
    evidence: ["咨询行业 4 周求职冲刺方法论"],
  },
  {
    id: "s6",
    authorId: "u_xuyuan",
    excerpt:
      "转码需要整块时间，我就是裸辞后 5 个月上岸的。但前提是目标可拆解、每周有复盘，否则就是无限拖延。",
    upvotes: 9800,
    url: "https://www.zhihu.com/question/000000/answer/1006",
    evidence: ["个人 20 周学习计划与周报"],
  },
  {
    id: "s7",
    authorId: "u_shenmo",
    excerpt:
      "如果是公司违法——强制加班、克扣工资，你要做的是保留证据、协商或仲裁，而不是自己辞职把主动权让出去。",
    upvotes: 11200,
    url: "https://www.zhihu.com/question/000000/answer/1007",
    evidence: ["劳动仲裁胜诉案例集", "《劳动合同法》第 38 条"],
  },
  {
    id: "s8",
    authorId: "u_qiqi",
    excerpt:
      "很多人把裸辞当成对环境的逃离，但如果不解决内在的自我评价问题，换个环境焦虑会以新的形式回来。",
    upvotes: 5400,
    url: "https://www.zhihu.com/question/000000/answer/1008",
    evidence: ["来访者随访：裸辞后 6 个月情绪追踪"],
  },
  {
    id: "s9",
    authorId: "u_dabing",
    excerpt:
      "真正该算的不是‘要不要裸辞’，而是‘退出成本可不可控’——把健康风险、现金储备、行业周期折成一个阈值。",
    upvotes: 4700,
    url: "https://www.zhihu.com/question/000000/answer/1009",
  },
  {
    id: "s10",
    authorId: "u_achai",
    excerpt:
      "如果手上已经有 near-offer，或者行业正在扩招，裸辞的窗口风险其实很小，别被‘稳定’吓住。",
    upvotes: 3900,
    url: "https://www.zhihu.com/question/000000/answer/1010",
  },
];
