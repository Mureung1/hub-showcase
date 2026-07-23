package com.punchman.devpulse.collector.alio;

import feign.Headers;
import feign.RequestLine;

/**
 * vanilla feign-core 인터페이스 (Spring Cloud OpenFeign 아님 — @FeignClient 미사용).
 * 반환형이 String이라 커스텀 Decoder 불필요, 바디도 인코딩된 문자열을 그대로 넘겨 커스텀 Encoder 불필요.
 */
public interface AlioRecruitInquiryClient {

    @RequestLine("POST /new/odaApiMng/recrutInquiryAjaxList.do")
    @Headers({
            "Content-Type: application/x-www-form-urlencoded",
            "X-Requested-With: XMLHttpRequest"
    })
    String search(String formBody);
}
