import PagePlaceholder from "./PagePlaceholder";

function MissionDetail() {
  return (
    <PagePlaceholder
      title="미션 상세 / 수행"
      description="선택한 미션의 상세 설명, 수행 가이드, 단계별 체크리스트, 참고 자료를 확인합니다."
      items={[
        { title: "수행 가이드", text: "미션을 완료하기 위한 단계별 안내를 제공합니다." },
        { title: "체크리스트", text: "진행 상태를 관리할 수 있도록 체크 항목을 제공합니다." },
        { title: "결과물 업로드", text: "미션 완료 후 제출 화면으로 이동합니다." },
      ]}
    />
  );
}

export default MissionDetail;
