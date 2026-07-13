import PagePlaceholder from "./PagePlaceholder";

function UploadResult() {
  return (
    <PagePlaceholder
      title="결과물 업로드"
      description="1차 MVP에서는 파일 업로드 대신 GitHub, Notion, 블로그, 배포 URL 같은 링크를 제출합니다."
      items={[
        { title: "링크 입력", text: "결과물 URL을 입력합니다." },
        { title: "설명 입력", text: "수행 과정, 맡은 역할, 어려웠던 점을 작성합니다." },
        { title: "제출 후", text: "AI 피드백 화면으로 이동합니다." },
      ]}
    />
  );
}

export default UploadResult;
