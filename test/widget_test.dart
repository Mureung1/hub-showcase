import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/main.dart';

void main() {
  testWidgets('앱이 스캐폴딩 상태에서 렌더된다', (tester) async {
    await tester.pumpWidget(const MyApp());

    expect(find.text('One-Step'), findsOneWidget);
  });
}
