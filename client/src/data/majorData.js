// client/src/data/majorData.js
export const MAJOR_DATA = {
  "IT대학": {
    "컴퓨터학부": {
      "글로벌SW융합전공": {
        totalCredits: 130,
        majorCredits: 51,
        generalCredits: 30,
        hasTracks: true,
        tracks: {
          "multi-major": {
            name: "다중전공 트랙",
            requirements: [
              { label: "다중전공 이수", type: "binary" },
              { label: "해외대학 인정학점", value: 9, unit: "학점" },
              { label: "현장실습", value: 3, unit: "학점" },
              { label: "창업교과목", value: 15, unit: "학점 (창업 대체 가능)" },
              { label: "종합설계교과목", value: 3, unit: "학점" },
            ],
          },
          "overseas-dual-degree": {
            name: "해외복수학위 트랙",
            requirements: [
              { label: "해외복수학위 과정 이수 또는 교환학생 1년 이상", type: "binary" },
              { label: "창업교과목", value: 3, unit: "학점" },
            ],
          },
          "master-linked": {
            name: "학석사연계 트랙",
            requirements: [
              { label: "해외대학 인정학점", value: 6, unit: "학점" },
              { label: "현장실습", value: 3, unit: "학점" },
            ],
          },
        },
      },
    },
  },
};