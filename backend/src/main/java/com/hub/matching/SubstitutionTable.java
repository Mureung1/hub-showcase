package com.hub.matching;

/** 상위 자격 대체 규칙. held 가 required 를 충족하는가. */
public interface SubstitutionTable {
    boolean satisfies(String held, String required);
}
