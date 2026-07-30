import 'package:flutter/material.dart';

import '../../../core/theme/app_radius.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/difficulty_pill.dart';
import '../../../core/widgets/quest_source_chip.dart';
import '../../../core/widgets/reward_chip.dart';
import '../../../models/difficulty.dart';
import '../../../models/quest_draft.dart';
import '../../../models/quest_source.dart';

/// 분해 초안 카드 — **저장 전 [QuestDraft]** 전용 표시 위젯.
///
/// [QuestCard]와 같은 시각 스타일(흰 카드 + 좌측 난이도 accent 세로 보더 + 난이도 pill
/// + 제목 + 보상 칩)을 공유하되, `QuestCard`는 저장된 [Quest] 전용이고 완료 체크 버튼이
/// 붙는 반면 초안은 완료 버튼이 없다.
///
/// **배치(결과 확인 화면).** 태그가 먼저 서고, 내용이 가운데, 보상이 받친다.
/// ```
/// [난이도 ▾] [✨ AI] [방금 나눔]        [🔄] [✕]
/// 퀘스트 제목                            ✎   ← 카드 폭을 온전히 쓴다
/// 🪙 +3 · ★ XP +5
/// ```
/// 태그가 맨 윗줄로 올라온 이유: 난이도·출처는 **제목을 읽기 전에** 판단에 쓰이는
/// 메타 정보다(「이건 AI가 나눈 쉬운 항목」). 보상은 반대로 제목을 읽고 난 뒤의
/// 결과값이라 맨 아래에 둔다. 🔄·✕는 태그와 같은 줄 오른쪽 끝에 모아 제목 줄이
/// 컨트롤에 잠식당하지 않게 한다.
///
/// **정렬은 행 단위다**(홈 [QuestCard]식 좌우 2열 분할이 아니다 — 그러면 제목 폭이
/// 좁아져 줄바꿈이 늘어난다). 대신 🔄·✕·✎가 모두 [_actionButtonSize] 폭 박스에
/// 담겨 오른쪽 끝에서 하나의 세로 열을 이룬다.
///
/// 태그를 `Row`가 아니라 **`Wrap`** 에 담는 이유: 칩이 최대 3개(난이도·출처·방금
/// 나눔)라 좁은 폭·큰 글꼴 배율에서 버튼 두 개와 한 줄에 들어가지 않는다. 폭이
/// 모자라면 태그가 다음 줄로 내려가고 버튼은 자리를 지킨다([RewardChip]이 Row→Wrap
/// 으로 고쳐진 것과 같은 처방).
///
/// **편집 컨트롤은 선택적이다.** [onEditTitle]·[onChangeDifficulty]·[onDelete]가
/// 모두 null이면 예전처럼 순수 표시 전용으로 동작한다(하위호환). 콜백을 주면 해당
/// 컨트롤이 켜진다. 카드는 "편집 요청"만 발신하고, 실제 편집 다이얼로그나 상태 변경은
/// 화면(부모)이 처리한다.
///
/// 색 규칙(one-step-design):
/// - 좌측 accent·난이도 pill = 난이도 색(`difficultyAccent` / [DifficultyPill]).
/// - 노랑(코인·보상)은 [RewardChip]이 전담한다. 직접 노랑을 쓰지 않는다.
/// - 편집·삭제 컨트롤은 중립(`onSurfaceVariant`)이다. 삭제를 error 빨강으로 칠하지
///   않는다 — Hard 난이도가 error색이라 혼동을 부른다.
class QuestDraftCard extends StatelessWidget {
  const QuestDraftCard({
    super.key,
    required this.draft,
    this.onEditTitle,
    this.onChangeDifficulty,
    this.onDelete,
    this.onReDecompose,
    this.isReDecomposing = false,
    this.isJustSplit = false,
    this.showSourceChip = false,
  });

  final QuestDraft draft;

  /// 제목 수정 요청. 화면이 편집 다이얼로그를 띄운다.
  final VoidCallback? onEditTitle;

  /// 난이도 변경 요청. 선택된 [Difficulty]를 전달한다.
  final ValueChanged<Difficulty>? onChangeDifficulty;

  /// 삭제 요청.
  final VoidCallback? onDelete;

  /// 개별 재분해 요청 — 이 항목을 더 작은 하위 퀘스트들로 다시 나눈다.
  /// AI 재요청이라 버튼은 **블루**(secondary)다(one-step-design "AI=블루").
  final VoidCallback? onReDecompose;

  /// 이 항목이 재분해 중인지. true면 🔄 자리에 블루 스피너 + 비활성(중복 탭 방지 시각화).
  final bool isReDecomposing;

  /// 이 항목이 **방금 개별 재분해로 갓 생겨난 하위 초안**인지. true면 태그 줄에 작은
  /// 블루 "방금 나눔" 칩을 띄워 "뭐가 새로 생겼는지"를 알린다(#6). AI 결과라 블루
  /// (secondary)다 — 노랑(보상)은 쓰지 않는다.
  final bool isJustSplit;

  /// `✨ AI` 출처 칩을 태그 줄에 띄울지.
  ///
  /// **[QuestDraft] 자신은 출처를 모른다.** 같은 초안이 AI 분해에서 올 수도, JSON
  /// 파싱 실패 후 템플릿 폴백에서 올 수도 있어서다. 그래서 판단은 화면(부모)이 한다
  /// (`_ResultSection`이 `DecomposeSource`를 보고 결정). 템플릿 결과에 "AI"를 붙이면
  /// 거짓말이 되고, 그 사실은 이미 폴백 배너가 말하고 있다.
  ///
  /// 기본값이 `false`인 이유: 표시 전용으로 이 카드를 띄우는 자리(하위호환)는 출처를
  /// 알 길이 없다. 모를 때는 붙이지 않는 쪽이 안전하다.
  final bool showSourceChip;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final accent = difficultyAccent(context, draft.difficulty);

    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        // Figma 실측 24. 목록의 본문 카드지만 결과 확인 화면에서는 한 장 한 장이
        // 크게 읽혀야 해서 표준 12가 아니라 큰 컨테이너 라운드를 쓴다.
        borderRadius: AppRadius.lgAll,
        // Figma 실측 보더는 `#becabc`지만 토큰 `outlineVariant`(`#bccbb9`)를 유지한다
        // — 차이가 육안으로 보이지 않는데 값을 새로 박으면 tokens.md와 이중 진실원이 된다.
        border: Border.all(color: scheme.outlineVariant),
        // 좌측 accent 세로 보더 — QuestCard와 동일한 gradient 트릭(components.md).
        gradient: LinearGradient(
          colors: [accent, accent, Colors.transparent],
          stops: const [0, 0.012, 0.012],
        ),
      ),
      padding: _cardPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 태그류(난이도 · 출처 · 방금 나눔)는 한 묶음이다. 폭이 모자라면
              // 버튼을 밀어내는 대신 태그가 다음 줄로 내려간다.
              Expanded(
                child: Wrap(
                  spacing: AppSpacing.smd,
                  runSpacing: AppSpacing.xs,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    // 난이도: 콜백이 있으면 팝업으로 선택 가능, 없으면 읽기 전용 pill.
                    _DifficultyControl(this),
                    // 출처: 화면이 켜 줄 때만. 칩 자체는 목록 카드와 공용
                    // ([QuestSourceChip]) — 난이도 pill과 형태가 같아 높이가 맞는다.
                    if (showSourceChip)
                      const QuestSourceChip(source: QuestSource.ai),
                    // #6 방금 재분해로 갓 생겨난 항목이면 "방금 나눔" 칩.
                    if (isJustSplit) const _JustSplitChip(),
                  ],
                ),
              ),
              // 재분해: 콜백이 있으면 블루 🔄 버튼(AI 재요청). 진행 중이면 블루 스피너 + 비활성.
              // 두 버튼 사이에 간격을 두지 않는다 — 둘 다 [_actionButtonSize] 박스에
              // 아이콘 20이라 각자 8씩 내부 여백을 갖고, 글리프 간격은 그것만으로 16이
              // 된다. 여기서 4px을 더 쓰면 좁은 화면·큰 배율에서 왼쪽 태그가 설 자리를 잃는다.
              if (onReDecompose != null)
                _ReDecomposeButton(
                  onPressed: onReDecompose!,
                  isBusy: isReDecomposing,
                ),
              // 삭제: 콜백이 있으면 태그 행 오른쪽 끝.
              //
              // 크기를 [_actionButtonSize] 정사각으로 **명시**한다(기본 48도, 예전의
              // `visualDensity.compact`도 아니다). 🔄와 박스 폭이 정확히 같아야
              // 제목 줄의 ✎까지 이어지는 오른쪽 세로 열이 성립하기 때문이다.
              if (onDelete != null)
                IconButton(
                  onPressed: onDelete,
                  tooltip: '삭제',
                  iconSize: _actionIconSize,
                  color: scheme.onSurfaceVariant,
                  style: IconButton.styleFrom(
                    minimumSize: const Size.square(_actionButtonSize),
                    padding: EdgeInsets.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  icon: const Icon(Icons.close),
                ),
            ],
          ),
          AppSpacing.gapSm,
          // 제목: 콜백이 있으면 탭 가능(옆에 편집 아이콘), 없으면 순수 텍스트.
          // **카드 폭을 온전히 쓴다** — 이 카드에서 읽혀야 하는 것은 컨트롤이 아니라 내용이다.
          if (onEditTitle != null)
            _EditableTitle(title: draft.title, onEditTitle: onEditTitle!)
          else
            Text(draft.title, style: theme.textTheme.bodyLarge),
          AppSpacing.gapSm,
          // 보상은 제목을 읽고 난 뒤의 결과값이라 맨 아래다. 노랑은 이 칩이 전담한다.
          RewardChip(reward: draft.reward),
        ],
      ),
    );
  }
}

/// 초안 카드 내부 여백 — Figma 실측 21을 화면 좌우 여백과 같은 20으로 맞춘다.
///
/// 오른쪽만 [AppSpacing.smd](12)인 이유: 그 자리에 서는 아이콘 버튼들이 모두
/// [_actionButtonSize](36) 박스에 아이콘 [_actionIconSize](20)라 **내부 여백이
/// 좌우 8씩**이다. 따라서 12 + 8 = 20으로 왼쪽 패딩 20과 시각적으로 맞아떨어진다.
/// (예전 값 8은 `IconButton` 기본/compact가 자체 여백 10을 갖는다는 전제로 계산한
/// 것이다. 이제 두 버튼 모두 크기를 명시하고 `padding: zero`를 주므로 그 전제는
/// 사라졌다 — 8을 그대로 두면 오른쪽이 2 덜 들어가 태그·버튼이 카드 밖으로 붙어 보인다.)
/// 20을 그대로 주면 반대로 오른쪽만 한 단 더 밀려 보이고, 좁은 화면·큰 글꼴 배율에서
/// 왼쪽 태그가 설 자리를 그만큼 잃는다.
const EdgeInsets _cardPadding = EdgeInsets.fromLTRB(
  AppSpacing.screenH,
  AppSpacing.screenH,
  AppSpacing.smd,
  AppSpacing.screenH,
);

/// 태그 행 오른쪽 아이콘 버튼의 아이콘 크기.
const double _actionIconSize = 20;

/// 태그 행 오른쪽 액션 버튼(🔄 · ✕)의 박스 한 변.
///
/// **두 버튼이 이 상수를 공유해야** 오른쪽 세로 열이 성립한다. 제목 줄의 ✎도 같은 폭
/// 박스 안에 가운데 정렬돼 같은 열에 선다.
///
/// 48이 아니라 36인 이유: 태그 행의 실질 높이는 난이도 pill(약 24)이 정하는데, 버튼이
/// 48이면 행 높이가 통째로 48이 돼 본문보다 컨트롤이 위쪽 공간을 더 먹는다. 36이면
/// 행 높이가 pill과 비슷해지고, 아이콘 20 + 좌우 8 여백으로 터치도 잡힌다.
///
/// **`minimumSize`만으로는 36이 되지 않는다.** `IconButton`은 테마 기본
/// `MaterialTapTargetSize.padded`를 따라 실제 레이아웃 박스를 최소 48로 부풀린다
/// (36 박스는 그 안에 가운데 정렬될 뿐이라, 눈에는 36인데 자리는 48을 먹는다 —
/// 행 높이도 48로 남고 ✎ 열이 6 어긋난다). 그래서 두 버튼 모두 `shrinkWrap`을 함께 준다.
/// 대가로 터치 영역이 48 권장치 아래인 36이 된다. 두 버튼 다 파괴적이지 않은 동작
/// (재분해·초안 삭제)이고, 실수로 눌러도 되돌릴 수 있어 이쪽을 택했다.
const double _actionButtonSize = 36;

/// "더 작게 나누기"(개별 재분해) 버튼 — 블루 틴트 배경의 [_actionButtonSize] 정사각 버튼.
///
/// 색 규칙: AI 재요청이라 아이콘은 **블루**(secondary), 배경은 옅은 블루 틴트다.
/// Figma 실측은 `rgba(33,112,228,0.1)` on white(=`#e9f1fc`)지만, 육안으로 구분되지
/// 않는 `surfaceContainer`(`#e5eeff`)를 쓴다 — 알파 파생을 남기지 않으면서 **다크에서도
/// `ColorScheme` 경로가 그대로 살아난다**(다크 사양은 Figma에 없다).
///
/// 진행 중([isBusy])이면 **같은 크기 자리에** 블루 스피너가 돌고 버튼이 사라진다.
/// 자리를 그대로 지키는 이유: 태그 행이 들썩이면 사용자가 옆 버튼을 잘못 누른다.
class _ReDecomposeButton extends StatelessWidget {
  const _ReDecomposeButton({required this.onPressed, required this.isBusy});

  final VoidCallback onPressed;
  final bool isBusy;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (isBusy) {
      return Container(
        width: _actionButtonSize,
        height: _actionButtonSize,
        decoration: BoxDecoration(
          color: scheme.surfaceContainer,
          borderRadius: AppRadius.mdAll,
        ),
        child: Center(
          child: SizedBox(
            width: _actionIconSize,
            height: _actionIconSize,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: scheme.secondary,
            ),
          ),
        ),
      );
    }

    return IconButton(
      onPressed: onPressed,
      tooltip: '더 작게 나누기',
      iconSize: _actionIconSize,
      icon: const Icon(Icons.replay),
      style: IconButton.styleFrom(
        backgroundColor: scheme.surfaceContainer,
        foregroundColor: scheme.secondary,
        minimumSize: const Size.square(_actionButtonSize),
        padding: EdgeInsets.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.mdAll),
      ),
    );
  }
}

/// 난이도 표시. 콜백이 있으면 [DifficultyPill]을 팝업 트리거로 감싸고, 없으면 pill만.
///
/// [DifficultyPill] 자체는 수정하지 않는다(다른 화면이 읽기 전용으로 씀). 감싸서
/// 상호작용만 더한다. 난이도 색(쉬움 그린 · 보통 노랑 · 어려움 빨강)도 그대로다.
///
/// **자기 크기만큼만 차지한다**(예전의 `Align` 래퍼를 걷어냈다). 이제 태그 `Wrap`의
/// 자식이라, 폭을 다 먹으면 옆의 보상 칩이 설 자리가 사라진다.
class _DifficultyControl extends StatelessWidget {
  const _DifficultyControl(this.card);

  final QuestDraftCard card;

  @override
  Widget build(BuildContext context) {
    final onChangeDifficulty = card.onChangeDifficulty;
    if (onChangeDifficulty == null) {
      return DifficultyPill(difficulty: card.draft.difficulty);
    }

    final theme = Theme.of(context);
    return PopupMenuButton<Difficulty>(
      tooltip: '난이도 변경',
      initialValue: card.draft.difficulty,
      onSelected: onChangeDifficulty,
      itemBuilder: (context) => [
        for (final d in Difficulty.values)
          PopupMenuItem(value: d, child: Text(d.label)),
      ],
      child: Padding(
        // pill이 작아 터치 영역을 넓힌다.
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // pill은 접힐 수 있어야 한다. `Row`는 기본으로 자식에게 **무한 폭**을 주므로
            // pill이 한 줄 고정 폭(배율 2.0·좁은 폭에서 약 138)으로 부풀고, 옆의 ▾까지
            // 더하면 태그 자리를 넘겨 클리핑된다. `Flexible`이면 남은 폭 안에서 라벨이
            // 접힌다(평상시 배율에서는 잔여 폭이 남아 아무 변화가 없다).
            Flexible(child: DifficultyPill(difficulty: card.draft.difficulty)),
            Icon(
              Icons.arrow_drop_down,
              size: 18,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}

/// "방금 나눔" 칩 — 개별 재분해로 갓 생겨난 항목임을 알리는 작은 블루 pill.
///
/// 태그 `Wrap` 안에서 난이도 pill·[QuestSourceChip]과 나란히 선다(같은 full 라운드 ·
/// labelSmall · 같은 패딩이라 높이가 어긋나지 않는다).
///
/// 색 규칙(one-step-design): AI 결과라 **블루**(secondary)다. 노랑(코인·보상)은
/// 쓰지 않는다 — 배경은 칩 배경 토큰(`surfaceContainer` = Figma 태그 배경 `#e5eeff`),
/// 텍스트/아이콘은 `secondary`. 값은 토큰을 참조하고 HEX를 직접 쓰지 않는다.
///
/// 배경에서 `secondaryContainer.withValues(alpha: 0.5)`를 걷어낸 이유: 알파 파생값은
/// 뒤에 깔린 카드 색에 따라 흔들려 Figma 실측과 어긋난다(`app_colors.dart` 규칙).
class _JustSplitChip extends StatelessWidget {
  const _JustSplitChip();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: scheme.surfaceContainer,
        borderRadius: AppRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 채운 ✦. Material Icons는 `Icons.auto_awesome`이 곧 채움이다.
          Icon(Icons.auto_awesome, size: 12, color: scheme.secondary),
          AppSpacing.gapWXs,
          // 큰 글꼴 배율에서 라벨이 카드 폭을 넘지 않게 접힐 여지를 준다.
          Flexible(
            child: Text(
              '방금 나눔',
              style: theme.textTheme.labelSmall?.copyWith(
                color: scheme.secondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 탭하면 제목 편집을 요청하는 제목 행. 옆에 작은 편집 아이콘.
///
/// ✎는 [_actionButtonSize] 폭 박스 안에 가운데 정렬한다 — 위 태그 행의 🔄·✕가 같은
/// 폭 박스라, 이렇게 해야 세 글리프의 중심이 하나의 세로 열에 선다. 감싸지 않으면
/// ✎만 버튼 내부 여백(8)만큼 바깥에 찍혀 열이 어긋난다.
///
/// 아이콘 크기는 18로 유지한다(버튼의 20보다 작다). 제목 수정은 삭제·재분해보다
/// **보조 신호**라 같은 열에 서더라도 무게는 덜 나가야 한다.
class _EditableTitle extends StatelessWidget {
  const _EditableTitle({required this.title, required this.onEditTitle});

  final String title;
  final VoidCallback onEditTitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onEditTitle,
      borderRadius: AppRadius.smAll,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: Text(title, style: theme.textTheme.bodyLarge)),
            SizedBox(
              width: _actionButtonSize,
              child: Center(
                child: Icon(
                  Icons.edit_outlined,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
