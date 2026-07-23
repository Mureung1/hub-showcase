import { describe, it, expect, vi, afterEach } from "vitest"
import { buildFuzzyPattern, findVerbatimMatch, parseAnalysisResponse } from "./llmService.js"

describe("findVerbatimMatch", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("정상 케이스", () => {
    it("문단에 candidateText가 정확히 그대로 존재하면 그 부분 문자열을 반환한다", () => {
      const paragraphs = ["The company reported strong earnings this quarter."]
      const result = findVerbatimMatch(paragraphs, "strong earnings this quarter")
      expect(result).toBe("strong earnings this quarter")
    })

    it("candidateText가 곧은따옴표이고 원문이 스마트따옴표면 원문 형태로 복구해 반환한다", () => {
      const paragraphs = [`The CEO said, "we expect growth," during the call.`]
      const smartQuotePragraphs = [`The CEO said, “we expect growth,” during the call.`]
      const result = findVerbatimMatch(smartQuotePragraphs, `"we expect growth,"`)
      expect(result).toBe("“we expect growth,”")
    })

    it("candidateText가 공백 하나인데 원문에 줄바꿈/연속 공백이 있으면 원문 형태로 복구해 반환한다", () => {
      const paragraphs = ["Revenue grew\n  20% year over year."]
      const result = findVerbatimMatch(paragraphs, "Revenue grew 20%")
      expect(result).toBe("Revenue grew\n  20%")
    })

    it("첫 문단이 아니라 두 번째 문단에서 매치되어도 해당 문단 기준으로 반환한다", () => {
      const paragraphs = [
        "Nothing relevant here.",
        "The stock rallied after the announcement.",
      ]
      const result = findVerbatimMatch(paragraphs, "The stock rallied")
      expect(result).toBe("The stock rallied")
    })
  })

  describe("빈 값", () => {
    it("paragraphs가 빈 배열이면 null을 반환한다", () => {
      const result = findVerbatimMatch([], "anything")
      expect(result).toBeNull()
    })

    it("candidateText가 빈 문자열이면 첫 문단의 빈 매치를 반환한다", () => {
      const paragraphs = ["Some paragraph text."]
      const result = findVerbatimMatch(paragraphs, "")
      expect(result).toBe("")
    })

    it("어느 문단에서도 candidateText를 찾지 못하면 null을 반환한다", () => {
      const paragraphs = ["Completely unrelated sentence."]
      const result = findVerbatimMatch(paragraphs, "not present anywhere")
      expect(result).toBeNull()
    })
  })

  describe("경계값", () => {
    it("candidateText가 정규식 특수문자로만 구성되어도 리터럴로 매치한다", () => {
      const paragraphs = ["Guidance was raised to $1.20 (up from $1.00)."]
      const result = findVerbatimMatch(paragraphs, "$1.20 (up from $1.00)")
      expect(result).toBe("$1.20 (up from $1.00)")
    })

    it("candidateText가 공백만으로 구성되면 임의 길이의 공백 런에 매치한다", () => {
      const paragraphs = ["a\n\t  b"]
      const result = findVerbatimMatch(paragraphs, " ")
      expect(result).toBe("\n\t  ")
    })

    it("candidateText가 문단의 시작과 끝 경계에 걸쳐 있어도 매치한다", () => {
      const paragraphs = ["Shares fell sharply"]
      const result = findVerbatimMatch(paragraphs, "Shares fell sharply")
      expect(result).toBe("Shares fell sharply")
    })
  })

  describe("실패하는 경우", () => {
    it("RegExp 생성이 실패하면 null을 반환한다", () => {
      vi.spyOn(global, "RegExp").mockImplementation(() => {
        throw new SyntaxError("invalid regex")
      })

      const result = findVerbatimMatch(["irrelevant paragraph"], "anything")
      expect(result).toBeNull()
    })
  })
})

describe("buildFuzzyPattern", () => {
  it("정규식 특수문자를 이스케이프한다", () => {
    const pattern = buildFuzzyPattern("a.b*c(d)")
    expect(new RegExp(pattern).test("a.b*c(d)")).toBe(true)
    expect(new RegExp(pattern).test("axbxcxdx")).toBe(false)
  })

  it("스마트/곧은따옴표를 모두 포괄하는 문자 클래스로 치환한다", () => {
    const pattern = buildFuzzyPattern(`"quoted"`)
    expect(new RegExp(pattern).test(`"quoted"`)).toBe(true)
    expect(new RegExp(pattern).test("“quoted”")).toBe(true)
  })

  it("연속 공백을 \\s+ 패턴으로 치환한다", () => {
    const pattern = buildFuzzyPattern("a b")
    expect(new RegExp(pattern).test("a\n\t  b")).toBe(true)
  })
})

describe("parseAnalysisResponse", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function makeResponse(body) {
    return { content: [{ text: typeof body === "string" ? body : JSON.stringify(body) }] }
  }

  const validBody = {
    sentences: [
      { text: "reported strong quarterly earnings", translation: "번역1", reason: "이유1" },
      { text: "Shares fell sharply", translation: "번역2", reason: "이유2" },
    ],
    terms: [{ term: "guidance", definition: "설명" }],
    summaryBullets: ["요약1", "요약2", "요약3"],
    insight: "인사이트",
    marketSentiment: "bullish",
  }
  const paragraphs = [
    "The company reported strong quarterly earnings today.",
    "Shares fell sharply on the news.",
  ]

  describe("정상 케이스", () => {
    it("모든 필드가 올바른 형태면 정제된 결과를 반환하고 sentences에 s1, s2 순서로 id를 부여한다", () => {
      const result = parseAnalysisResponse(makeResponse(validBody), paragraphs)

      expect(result).toEqual({
        sentences: [
          { id: "s1", text: "reported strong quarterly earnings", translation: "번역1", reason: "이유1" },
          { id: "s2", text: "Shares fell sharply", translation: "번역2", reason: "이유2" },
        ],
        terms: [{ term: "guidance", definition: "설명" }],
        summaryBullets: ["요약1", "요약2", "요약3"],
        insight: "인사이트",
        marketSentiment: "bullish",
      })
    })

    it.each([
      ["Bullish ", "bullish"],
      ["BEARISH", "bearish"],
      [" Neutral", "neutral"],
    ])("marketSentiment이 %s여도 정규화되어 %s로 반환된다", (raw, expected) => {
      const body = { ...validBody, marketSentiment: raw }
      const result = parseAnalysisResponse(makeResponse(body), paragraphs)
      expect(result.marketSentiment).toBe(expected)
    })

    it("응답이 ```json 코드펜스로 감싸져 있어도 정상 파싱한다", () => {
      const fenced = "```json\n" + JSON.stringify(validBody) + "\n```"
      const result = parseAnalysisResponse(makeResponse(fenced), paragraphs)
      expect(result.marketSentiment).toBe("bullish")
    })

    it("insight 앞뒤 공백을 trim해서 반환한다", () => {
      const body = { ...validBody, insight: "  인사이트  " }
      const result = parseAnalysisResponse(makeResponse(body), paragraphs)
      expect(result.insight).toBe("인사이트")
    })
  })

  describe("빈 값", () => {
    it("sentences와 terms가 빈 배열이면 그대로 빈 배열을 반환한다", () => {
      const body = { ...validBody, sentences: [], terms: [] }
      const result = parseAnalysisResponse(makeResponse(body), paragraphs)
      expect(result.sentences).toEqual([])
      expect(result.terms).toEqual([])
    })

    it("paragraphs가 빈 배열이면 모든 sentences가 걸러진다", () => {
      const result = parseAnalysisResponse(makeResponse(validBody), [])
      expect(result.sentences).toEqual([])
    })

    it("response.content가 없으면 빈 텍스트로 취급되어 JSON 파싱에서 실패한다", () => {
      expect(() => parseAnalysisResponse({}, paragraphs)).toThrow(SyntaxError)
    })
  })

  describe("경계값", () => {
    it("일부 sentence만 원문에서 매칭에 실패하면 매칭된 것만 남긴다", () => {
      const body = {
        ...validBody,
        sentences: [
          { text: "reported strong quarterly earnings", translation: "번역1", reason: "이유1" },
          { text: "this text is not in the paragraphs", translation: "번역2", reason: "이유2" },
        ],
      }
      const result = parseAnalysisResponse(makeResponse(body), paragraphs)
      expect(result.sentences).toEqual([
        { id: "s1", text: "reported strong quarterly earnings", translation: "번역1", reason: "이유1" },
      ])
    })

    it("두 sentence가 원문 복구 후 같은 텍스트가 되면 첫 번째만 남기고 id를 재부여한다", () => {
      const body = {
        ...validBody,
        sentences: [
          { text: "Shares fell sharply", translation: "번역1", reason: "이유1" },
          { text: "Shares  fell   sharply", translation: "번역2(중복)", reason: "이유2" },
        ],
      }
      const result = parseAnalysisResponse(makeResponse(body), paragraphs)
      expect(result.sentences).toEqual([
        { id: "s1", text: "Shares fell sharply", translation: "번역1", reason: "이유1" },
      ])
    })

    it("필드가 누락되거나 빈 문자열인 sentence/term 원소는 걸러지고 나머지는 유지된다", () => {
      const body = {
        ...validBody,
        sentences: [
          { text: "Shares fell sharply", translation: "번역1", reason: "이유1" },
          { text: "", translation: "번역2", reason: "이유2" },
          { text: "reported strong quarterly earnings", reason: "이유3" },
        ],
        terms: [
          { term: "guidance", definition: "설명" },
          { term: "", definition: "설명2" },
          { definition: "term 없음" },
        ],
      }
      const result = parseAnalysisResponse(makeResponse(body), paragraphs)
      expect(result.sentences).toEqual([
        { id: "s1", text: "Shares fell sharply", translation: "번역1", reason: "이유1" },
      ])
      expect(result.terms).toEqual([{ term: "guidance", definition: "설명" }])
    })

    it("summaryBullets가 3개가 아니어도 에러 없이 반환하고 경고를 남긴다", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const body = { ...validBody, summaryBullets: ["요약1", "요약2"] }

      const result = parseAnalysisResponse(makeResponse(body), paragraphs)

      expect(result.summaryBullets).toEqual(["요약1", "요약2"])
      expect(warnSpy).toHaveBeenCalled()
    })

    it("marketSentiment이 enum에 없으면 neutral로 폴백하고 경고를 남긴다", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const body = { ...validBody, marketSentiment: "very bullish" }

      const result = parseAnalysisResponse(makeResponse(body), paragraphs)

      expect(result.marketSentiment).toBe("neutral")
      expect(warnSpy).toHaveBeenCalled()
    })
  })

  describe("실패하는 경우", () => {
    it("응답 텍스트가 JSON이 아니면 SyntaxError를 던진다", () => {
      expect(() => parseAnalysisResponse(makeResponse("this is not json"), paragraphs)).toThrow(SyntaxError)
    })

    it.each([
      ["sentences가 배열이 아님", { ...validBody, sentences: {} }],
      ["terms가 배열이 아님", { ...validBody, terms: {} }],
      ["summaryBullets가 배열이 아님", { ...validBody, summaryBullets: "요약1,요약2,요약3" }],
      ["insight가 문자열이 아님", { ...validBody, insight: 123 }],
      ["insight가 공백뿐인 문자열", { ...validBody, insight: "   " }],
      ["marketSentiment이 문자열이 아님", { ...validBody, marketSentiment: null }],
    ])("%s이면 unexpected LLM response shape 에러를 던진다", (_label, body) => {
      expect(() => parseAnalysisResponse(makeResponse(body), paragraphs)).toThrow(
        "analyzeArticle: unexpected LLM response shape",
      )
    })
  })
})
