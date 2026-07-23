import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecipeInputForm from "./RecipeInputForm";

describe("RecipeInputForm", () => {
  afterEach(cleanup);

  it("처리 중에는 중복 제출을 막고 정규화한 입력을 한 번만 전달한다", async () => {
    let resolveRequest;
    const onPrepare = vi.fn();

    render(
      <RecipeInputForm
        isPrepared={false}
        onCancel={vi.fn()}
        onPrepare={onPrepare}
      />,
    );

    fireEvent.change(screen.getByLabelText(/직접 입력/), {
      target: { value: "  김치를 볶아 끓인다.  " },
    });
    expect(onPrepare).not.toHaveBeenCalled();

    onPrepare.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const submitButton = screen.getByRole("button", {
      name: /레시피 정리하기/,
    });

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(onPrepare).toHaveBeenCalledOnce();
    expect(onPrepare).toHaveBeenCalledWith({
      sourceUrl: null,
      rawText: "김치를 볶아 끓인다.",
    });
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/정리하고/);

    resolveRequest();
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it("요청 실패 후 입력과 오류를 유지하고 다시 시도할 수 있다", async () => {
    const onPrepare = vi.fn();

    render(
      <RecipeInputForm
        isPrepared={false}
        onCancel={vi.fn()}
        onPrepare={onPrepare}
      />,
    );

    const sourceUrlInput = screen.getByLabelText(/레시피 URL/);
    fireEvent.change(sourceUrlInput, {
      target: { value: "https://example.com/recipe" },
    });
    onPrepare.mockReset();
    onPrepare
      .mockRejectedValueOnce(
        new Error("URL을 가져오지 못했습니다. 직접 입력해 주세요."),
      )
      .mockResolvedValueOnce();
    const submitButton = screen.getByRole("button", {
      name: /레시피 정리하기/,
    });

    fireEvent.click(submitButton);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("URL을 가져오지 못했습니다. 직접 입력해 주세요.");
    expect(sourceUrlInput).toHaveValue("https://example.com/recipe");
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);
    await waitFor(() => expect(onPrepare).toHaveBeenCalledTimes(2));
  });
});
