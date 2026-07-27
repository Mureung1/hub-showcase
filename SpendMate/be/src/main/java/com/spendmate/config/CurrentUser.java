package com.spendmate.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 메서드 파라미터에 붙이면, 로그인 세션에 저장된 userId(Long)를 바로 주입받는다.
 * 세션이 없거나 로그인 안 된 상태면 CurrentUserArgumentResolver가 401을 던진다.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.PARAMETER)
public @interface CurrentUser {
}
