export function getCategoryStyle(categoryMain: string | null) {
  const styles: Record<string, string> = {
    영상: "bg-red-50 text-red-600 hover:bg-red-100",
    콘텐츠: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    개발: "bg-sky-50 text-sky-600 hover:bg-sky-100",
    쇼핑: "bg-purple-50 text-purple-600 hover:bg-purple-100",
    SNS: "bg-pink-50 text-pink-600 hover:bg-pink-100",
    건강: "bg-green-50 text-green-600 hover:bg-green-100",
    여행: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    패션: "bg-violet-50 text-violet-600 hover:bg-violet-100",
  };

  return styles[categoryMain ?? ""] ?? "bg-gray-100 text-gray-600 hover:bg-gray-200";
}
