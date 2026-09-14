import { describe, expect, test } from "bun:test";
import { parseQuestionAnswersPayload } from "../src/lib/opinion/zhihu-question-answers";

describe("Zhihu question_answers parser", () => {
  test("keeps real answer summaries and official paging metadata", () => {
    const page = parseQuestionAnswersPayload({
      Code: 0,
      Message: "success",
      Data: {
        Items: [
          {
            ContentType: "Answer",
            ContentToken: "answer-token-1",
            Url: "https://www.zhihu.com/question/123/answer/456",
            Summary: "第一条真实回答摘要",
          },
          {
            ContentType: "Answer",
            ContentToken: "answer-token-2",
            Url: "https://www.zhihu.com/question/123/answer/789",
            Summary: "第二条真实回答摘要",
          },
        ],
        Paging: { IsEnd: false, NextOffset: 20, Totals: 86 },
      },
    });

    expect(page.items).toHaveLength(2);
    expect(page.items[0].ContentToken).toBe("answer-token-1");
    expect(page.isEnd).toBe(false);
    expect(page.nextOffset).toBe(20);
    expect(page.total).toBe(86);
  });

  test("filters unusable items without inventing replacement summaries", () => {
    const page = parseQuestionAnswersPayload({
      Code: 0,
      Data: {
        Items: [
          { ContentType: "Answer", ContentToken: "missing-url", Summary: "有摘要但没有链接" },
          { ContentType: "Answer", ContentToken: "empty", Url: "https://www.zhihu.com/answer/1", Summary: "   " },
          { ContentType: "Answer", ContentToken: "valid", Url: "https://www.zhihu.com/answer/2", Summary: "保留下来的摘要" },
        ],
        Paging: { IsEnd: true },
      },
    });

    expect(page.items.map((item) => item.ContentToken)).toEqual(["valid"]);
    expect(page.isEnd).toBe(true);
    expect(page.nextOffset).toBeUndefined();
  });

  test("maps quota and auth failures to stable internal error codes", () => {
    expect(() => parseQuestionAnswersPayload({ Code: 30001, Message: "limited" })).toThrow("zhihu_rate_limited");
    expect(() => parseQuestionAnswersPayload({ Code: 20001, Message: "auth" })).toThrow("zhihu_auth_failed");
    expect(() => parseQuestionAnswersPayload({ Code: 90001, Message: "internal" })).toThrow("zhihu_question_answers_failed");
  });
});
