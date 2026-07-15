import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders trusted review map prototype", () => {
  render(<App />);
  expect(screen.getByLabelText("네이버지도 기반 리뷰 서비스")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("문래동 음식점, 강남역 카페")).toBeInTheDocument();
  expect(screen.getByText("네이버지도 키가 필요해요")).toBeInTheDocument();
});
