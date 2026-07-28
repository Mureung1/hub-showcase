package com.chasewar.global.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    // TCP 연결 수립까지의 제한. 국내 서버는 수십ms면 충분해 전 API 공통
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(2);

    // 응답 대기 제한. 각 API의 실측 최대치에 여유를 곱해 정함
    private static final Duration KAKAO_READ_TIMEOUT = Duration.ofSeconds(3);

    private static final Duration TMAP_READ_TIMEOUT = Duration.ofSeconds(3);

    private static final Duration SEOUL_READ_TIMEOUT = Duration.ofSeconds(5);

    private static final String KAKAO_BASE_URL = "https://dapi.kakao.com";
    private static final String KAKAO_AUTH_PREFIX = "KakaoAK ";

    private static final String TMAP_BASE_URL = "https://apis.openapi.sk.com";
    private static final String TMAP_APP_KEY_HEADER = "appKey";

    private static final String SEOUL_BASE_URL = "http://openapi.seoul.go.kr:8088";

    @Bean
    public RestClient kakaoRestClient(@Value("${kakao.api.key}") String apiKey) {
        return RestClient.builder()
                .baseUrl(KAKAO_BASE_URL)
                .defaultHeader(HttpHeaders.AUTHORIZATION, KAKAO_AUTH_PREFIX + apiKey)
                .requestFactory(requestFactory(KAKAO_READ_TIMEOUT))
                .build();
    }

    @Bean
    public RestClient tmapRestClient(@Value("${tmap.api.key}") String appKey) {
        return RestClient.builder()
                .baseUrl(TMAP_BASE_URL)
                .defaultHeader(TMAP_APP_KEY_HEADER, appKey)
                .requestFactory(requestFactory(TMAP_READ_TIMEOUT))
                .build();
    }

    @Bean
    public RestClient seoulRestClient() {
        return RestClient.builder()
                .baseUrl(SEOUL_BASE_URL)
                .requestFactory(requestFactory(SEOUL_READ_TIMEOUT))
                .build();
    }

    // 구현체(JDK HttpClient, Apache 등)마다 타임아웃 설정 위치가 다르다
    // detect()가 클래스패스에서 최적 구현을 고르고, settins를 그 구현에 맞게 적용해 준다
    private ClientHttpRequestFactory requestFactory(Duration readTimeout) {
        ClientHttpRequestFactorySettings settings = ClientHttpRequestFactorySettings.defaults()
                .withConnectTimeout(CONNECT_TIMEOUT)
                .withReadTimeout(readTimeout);

        return ClientHttpRequestFactoryBuilder.detect().build(settings);
    }
}
