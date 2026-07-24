import { describe, expect, it } from "vitest";
import { validateSignUpInput } from "./signUpValidation";

const validEmail = "user@example.com";
const validPassword = "password123";
const validNickname = "수영";

describe("validateSignUpInput", () => {
  it("모든 입력이 유효하면 빈 오류 객체를 반환해야 한다", () => {
    // 준비
    const input = { email: validEmail, password: validPassword, nickname: validNickname };

    // 실행
    const result = validateSignUpInput(input.email, input.password, input.nickname);

    // 확인
    expect(result).toEqual({});
  });

  it("이메일이 비어 있으면 이메일 필수 입력 오류를 반환해야 한다", () => {
    // 준비
    const email = "";

    // 실행
    const result = validateSignUpInput(email, validPassword, validNickname);

    // 확인
    expect(result).toEqual({ email: "이메일을 입력해 주세요." });
  });

  it("이메일 형식이 올바르지 않으면 이메일 형식 오류를 반환해야 한다", () => {
    // 준비
    const email = "user@example";

    // 실행
    const result = validateSignUpInput(email, validPassword, validNickname);

    // 확인
    expect(result).toEqual({ email: "올바른 이메일 형식으로 입력해 주세요." });
  });

  it("비밀번호가 비어 있으면 비밀번호 필수 입력 오류를 반환해야 한다", () => {
    // 준비
    const password = "";

    // 실행
    const result = validateSignUpInput(validEmail, password, validNickname);

    // 확인
    expect(result).toEqual({ password: "비밀번호를 입력해 주세요." });
  });

  it("비밀번호가 8자 미만이면 비밀번호 길이 오류를 반환해야 한다", () => {
    // 준비
    const password = "1234567";

    // 실행
    const result = validateSignUpInput(validEmail, password, validNickname);

    // 확인
    expect(result).toEqual({ password: "비밀번호는 8자 이상이어야 해요." });
  });

  it("비밀번호가 정확히 8자이면 오류를 반환하지 않아야 한다", () => {
    // 준비
    const password = "12345678";

    // 실행
    const result = validateSignUpInput(validEmail, password, validNickname);

    // 확인
    expect(result).toEqual({});
  });

  it("닉네임이 비어 있으면 닉네임 필수 입력 오류를 반환해야 한다", () => {
    // 준비
    const nickname = "";

    // 실행
    const result = validateSignUpInput(validEmail, validPassword, nickname);

    // 확인
    expect(result).toEqual({ nickname: "닉네임을 입력해 주세요." });
  });

  it("닉네임이 공백뿐이면 닉네임 필수 입력 오류를 반환해야 한다", () => {
    // 준비
    const nickname = "   ";

    // 실행
    const result = validateSignUpInput(validEmail, validPassword, nickname);

    // 확인
    expect(result).toEqual({ nickname: "닉네임을 입력해 주세요." });
  });

  it("닉네임이 2자 미만이면 닉네임 길이 오류를 반환해야 한다", () => {
    // 준비
    const nickname = "수";

    // 실행
    const result = validateSignUpInput(validEmail, validPassword, nickname);

    // 확인
    expect(result).toEqual({ nickname: "닉네임은 2~20자로 입력해 주세요." });
  });

  it("닉네임이 정확히 2자이면 오류를 반환하지 않아야 한다", () => {
    // 준비
    const nickname = "수영";

    // 실행
    const result = validateSignUpInput(validEmail, validPassword, nickname);

    // 확인
    expect(result).toEqual({});
  });

  it("닉네임이 정확히 20자이면 오류를 반환하지 않아야 한다", () => {
    // 준비
    const nickname = "가".repeat(20);

    // 실행
    const result = validateSignUpInput(validEmail, validPassword, nickname);

    // 확인
    expect(result).toEqual({});
  });

  it("닉네임이 20자를 초과하면 닉네임 길이 오류를 반환해야 한다", () => {
    // 준비
    const nickname = "가".repeat(21);

    // 실행
    const result = validateSignUpInput(validEmail, validPassword, nickname);

    // 확인
    expect(result).toEqual({ nickname: "닉네임은 2~20자로 입력해 주세요." });
  });

  it("여러 입력이 동시에 잘못되면 각 필드의 오류를 함께 반환해야 한다", () => {
    // 준비
    const input = { email: "", password: "1234567", nickname: " " };

    // 실행
    const result = validateSignUpInput(input.email, input.password, input.nickname);

    // 확인
    expect(result).toEqual({
      email: "이메일을 입력해 주세요.",
      password: "비밀번호는 8자 이상이어야 해요.",
      nickname: "닉네임을 입력해 주세요.",
    });
  });

  it("이메일 앞뒤에 공백이 있으면 이메일 형식 오류를 반환해야 한다", () => {
    // 준비
    const email = " user@example.com ";

    // 실행
    const result = validateSignUpInput(email, validPassword, validNickname);

    // 확인
    expect(result).toEqual({ email: "올바른 이메일 형식으로 입력해 주세요." });
  });

  it("닉네임 앞뒤에 공백이 있어도 공백을 제외한 길이가 유효하면 오류를 반환하지 않아야 한다", () => {
    // 준비
    const nickname = " 수영 ";

    // 실행
    const result = validateSignUpInput(validEmail, validPassword, nickname);

    // 확인
    expect(result).toEqual({});
  });
});
