package com.chasewar.place.api;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.chasewar.global.domain.vo.Coordinates;
import com.chasewar.place.domain.Place;
import com.chasewar.place.infra.placesearch.PlaceSearchClient;
import com.chasewar.support.ControllerTest;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

class PlaceControllerTest extends ControllerTest {

    @MockitoBean
    private PlaceSearchClient placeSearchClient;

    @DisplayName("키워드로 장소를 검색할 때")
    @Nested
    class Search {

        @DisplayName("검색된 장소 목록을 200으로 반환한다")
        @Test
        void success_search() throws Exception {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(List.of(new Place(
                            "이태원역 6호선",
                            "서울 용산구 이태원로 지하 177",
                            new Coordinates(37.5345, 126.9943)
                    )));

            // when & then
            mockMvc.perform(get("/api/places").param("keyword", "이태원역"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].name").value("이태원역 6호선"))
                    .andExpect(jsonPath("$[0].coordinates.latitude").value(37.5345));
        }

        @DisplayName("검색 결과가 없으면 빈 배열을 200으로 반환한다")
        @Test
        void success_empty() throws Exception {
            // given
            given(placeSearchClient.searchByKeyword(anyString()))
                    .willReturn(List.of());

            // when & then
            mockMvc.perform(get("/api/places").param("keyword", "abcde"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$").isEmpty());
        }

        @DisplayName("키워드가 빈 문자열이면 400과 에러 코드를 반환한다")
        @Test
        void fail_blankKeyword() throws Exception {
            // when & then
            mockMvc.perform(get("/api/places").param("keyword", ""))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_REQUEST_PARAMETER"));
        }
    }
}