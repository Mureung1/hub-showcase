/**
 * PtoP 사용자 설문 Google Form 생성 스크립트
 *
 * 사용 방법:
 * 1. https://script.google.com 에 접속한다.
 * 2. 새 프로젝트를 만든다.
 * 3. 이 파일 내용을 Code.gs에 붙여넣는다.
 * 4. createPtoPSurveyForm 함수를 실행한다.
 * 5. 실행 권한을 승인한 뒤, 로그에 출력된 editUrl / responseUrl을 확인한다.
 */
function createPtoPSurveyForm() {
  const form = FormApp.create('PtoP 서비스 설문조사');

  form.setDescription(
    [
      '안녕하세요. 저는 PtoP(Project to Portfolio)라는 서비스를 기획하고 있습니다.',
      '',
      'PtoP는 GitHub Repository나 프로젝트 폴더를 분석해서 프로젝트의 핵심 내용과 내가 한 작업을 정리하고, 포트폴리오에 활용할 수 있는 형태로 도와주는 서비스입니다.',
      '',
      '이번 설문은 제가 만들고 있는 PtoP가 실제 사용자에게 도움이 되는 방향으로 발전할 수 있을지 확인하기 위한 과정입니다. AI Agent Challenge 기간 동안 MVP를 만들고 있지만, 이후에도 계속 개선해 실제로 많은 사람들이 프로젝트 경험을 정리할 때 사용할 수 있는 서비스로 키워보고 싶습니다.',
      '',
      '본 설문은 PtoP의 분석 결과에 어떤 정보가 포함되면 좋을지 파악하기 위한 목적으로 진행됩니다. 응답해주신 내용은 서비스 기획, MVP 기능 개선, 향후 기능 우선순위 결정에 반영될 수 있습니다.',
      '',
      '응답은 개인을 식별할 수 없는 형태로 정리하며, 비공개 Repository, 팀 내부 자료, 공개하기 어려운 코드나 기획 정보는 작성하지 않아도 됩니다. 프로젝트 예시는 공개 가능한 범위에서만 적어주세요.',
      '',
      '설문 응답에 포함된 의견은 서비스 개선을 위한 참고 자료로만 활용되며, 응답자의 프로젝트 결과물이나 코드를 수집하지 않습니다.',
    ].join('\n'),
  );

  form.setConfirmationMessage(
    '설문에 응답해주셔서 감사합니다. PtoP 기획과 MVP 개선에 참고하겠습니다.',
  );
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);

  form
    .addMultipleChoiceItem()
    .setTitle('1. 현재 본인의 상황에 가장 가까운 항목을 선택해주세요.')
    .setChoiceValues([
      '대학교 1학년',
      '대학교 2학년',
      '대학교 3학년',
      '대학교 4학년',
      '졸업예정자',
      '졸업 후 취업준비 중',
      '재직 중',
      '기타',
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('2. 프로젝트를 포트폴리오에 정리할 때 가장 어려운 부분은 무엇인가요?')
    .setChoiceValues([
      '내가 맡은 역할을 정리하는 것',
      '핵심 기능을 고르는 것',
      '기술적 문제 해결 과정을 설명하는 것',
      '협업 경험을 표현하는 것',
      '프로젝트 성과나 배운 점을 정리하는 것',
      '기타',
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle('3. Repository를 분석했을 때 가장 먼저 보고 싶은 정보는 무엇인가요?')
    .setChoiceValues([
      '프로젝트 개요',
      '사용 기술 스택',
      '핵심 기능 목록',
      '주요 구현 파일/폴더',
      '참여자별 기여도',
      '최근 작업 내역',
      '포트폴리오에 쓸 만한 핵심 문장',
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle('4. 포트폴리오 작성에 가장 도움이 될 것 같은 분석 결과를 선택해주세요.')
    .setHelpText('가장 중요하다고 생각하는 항목을 2개 정도 선택해주세요.')
    .setChoiceValues([
      '내가 주로 작업한 기능',
      '내가 해결한 문제 또는 버그',
      '기술 선택 이유',
      '프로젝트 구조 요약',
      '협업 과정에서의 역할',
      '개선하거나 리팩토링한 부분',
      '트러블슈팅 경험',
    ])
    .setRequired(true);

  form
    .addScaleItem()
    .setTitle('5. commit message나 코드 변경 내역만으로 내 역할을 분석해주는 기능이 있다면 어느 정도 유용할 것 같나요?')
    .setBounds(1, 5)
    .setLabels('전혀 유용하지 않음', '매우 유용함')
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('6. 분석 결과가 나온 뒤, AI가 프로젝트 의도나 문제 해결 과정을 질문한다면 사용할 의향이 있나요?')
    .setChoiceValues([
      '적극적으로 사용할 것 같다',
      '필요할 때 사용할 것 같다',
      '질문이 짧으면 사용할 것 같다',
      '사용하지 않을 것 같다',
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle('7. 포트폴리오 초안에 꼭 포함되었으면 하는 항목은 무엇인가요?')
    .setChoiceValues([
      '프로젝트 한 줄 소개',
      '문제 정의',
      '핵심 기능',
      '나의 역할',
      '기술 스택',
      '문제 해결 과정',
      '협업 경험',
      '배운 점',
      '결과물 링크',
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('8. PtoP가 분석 결과를 제공한다면 어떤 형태가 가장 편할 것 같나요?')
    .setChoiceValues([
      '카드 형태 요약',
      'Markdown 문서',
      '포트폴리오 문장 초안',
      '체크리스트',
      'Notion에 붙여넣기 좋은 형태',
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle('9. 프로젝트 정리 도구를 사용할 때 가장 중요하게 보는 기준은 무엇인가요?')
    .setChoiceValues([
      '분석 정확도',
      '사용 편의성',
      '포트폴리오 문장 품질',
      '분석 속도',
      '내가 직접 수정하기 쉬운 구조',
      '디자인/가독성',
    ])
    .setRequired(true);

  form
    .addParagraphTextItem()
    .setTitle('10. 최근 진행한 프로젝트를 기준으로, 이런 내용까지 분석해주면 좋겠다고 생각한 것이 있다면 자유롭게 적어주세요.')
    .setRequired(false);

  form
    .addMultipleChoiceItem()
    .setTitle('11. PtoP를 실제로 사용해본다면 어떤 상황에서 가장 필요할 것 같나요?')
    .setChoiceValues([
      '프로젝트 종료 직후',
      '포트폴리오 작성 전',
      '자기소개서 작성 전',
      '면접 준비 전',
      '팀 프로젝트 회고 시',
      '기타',
    ])
    .setRequired(true);

  Logger.log('editUrl: ' + form.getEditUrl());
  Logger.log('responseUrl: ' + form.getPublishedUrl());
}
