export interface QuestionAnswerSummaryItem {
  ContentType?: string;
  ContentToken?: string;
  Url?: string;
  Summary?: string;
}

export interface QuestionAnswersPage {
  items: QuestionAnswerSummaryItem[];
  isEnd: boolean;
  nextOffset?: number;
  total?: number;
}

type RawQuestionAnswersResponse = {
  Code?: number;
  Message?: string;
  Data?: {
    Items?: QuestionAnswerSummaryItem[];
    Paging?: {
      IsEnd?: boolean;
      NextOffset?: number;
      Totals?: number;
    };
  };
};

export function parseQuestionAnswersPayload(payload: unknown): QuestionAnswersPage {
  const response = payload as RawQuestionAnswersResponse;
  if (!response || response.Code !== 0 || !response.Data) {
    if (response?.Code === 30001) throw new Error("zhihu_rate_limited");
    if (response?.Code === 20001) throw new Error("zhihu_auth_failed");
    throw new Error("zhihu_question_answers_failed");
  }

  const items = Array.isArray(response.Data.Items)
    ? response.Data.Items.filter((item) => typeof item?.Url === "string" && typeof item?.Summary === "string" && item.Summary.trim().length > 0)
    : [];
  const paging = response.Data.Paging ?? {};
  return {
    items,
    isEnd: Boolean(paging.IsEnd),
    nextOffset: Number.isFinite(Number(paging.NextOffset)) ? Number(paging.NextOffset) : undefined,
    total: Number.isFinite(Number(paging.Totals)) ? Number(paging.Totals) : undefined,
  };
}
