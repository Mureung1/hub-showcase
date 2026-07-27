import { render, screen } from "@testing-library/react";
import Field from "./Field";

describe("Field", () => {
  it("label 텍스트를 화면에 보여준다", () => {
    // 1) 렌더: Field를 가짜 화면에 띄운다 (필요한 props만 넘김)
    render(<Field label="출발지" value="" onChange={() => {}} />);

    // 2) 찾기 + 3) 확인: "출발지"라는 글자가 화면에 있나?
    expect(screen.getByText("출발지")).toBeInTheDocument();
  });
});
