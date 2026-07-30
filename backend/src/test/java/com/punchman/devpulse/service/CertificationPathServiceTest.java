package com.punchman.devpulse.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.punchman.devpulse.domain.Certification;
import com.punchman.devpulse.domain.CertificationPrerequisite;
import com.punchman.devpulse.pathfinder.CertificationNode;
import com.punchman.devpulse.pathfinder.TopologicalSortResult;
import com.punchman.devpulse.repository.jpa.CertificationPrerequisiteRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class CertificationPathServiceTest {

    private final CertificationRepository certificationRepository = mock(CertificationRepository.class);
    private final CertificationPrerequisiteRepository certificationPrerequisiteRepository =
            mock(CertificationPrerequisiteRepository.class);

    private final CertificationPathService service =
            new CertificationPathService(certificationRepository, certificationPrerequisiteRepository);

    private static final Certification SQLD = Certification.builder().id(1L).name("SQLD").build();
    private static final Certification JEONGBO = Certification.builder().id(2L).name("정보처리기사").build();
    private static final Certification SANUP = Certification.builder().id(3L).name("산업안전기사").build();

    @Test
    void noPrerequisiteRowsSortsByCertificationId() {
        stubCertifications(SANUP, SQLD, JEONGBO);
        when(certificationPrerequisiteRepository.findAll()).thenReturn(List.of());

        TopologicalSortResult result = service.computeOrder(List.of(3L, 1L, 2L));

        assertThat(result).isInstanceOf(TopologicalSortResult.Sorted.class);
        assertThat(((TopologicalSortResult.Sorted) result).order())
                .containsExactly(
                        new CertificationNode(1L, "SQLD"),
                        new CertificationNode(2L, "정보처리기사"),
                        new CertificationNode(3L, "산업안전기사"));
    }

    @Test
    void prerequisiteEdgeWithinSelectionIsRespected() {
        stubCertifications(SQLD, JEONGBO);
        when(certificationPrerequisiteRepository.findAll()).thenReturn(List.of(
                CertificationPrerequisite.builder()
                        .prerequisiteCertification(JEONGBO)
                        .certification(SQLD)
                        .build()));

        TopologicalSortResult result = service.computeOrder(List.of(1L, 2L));

        assertThat(result).isInstanceOf(TopologicalSortResult.Sorted.class);
        assertThat(((TopologicalSortResult.Sorted) result).order())
                .containsExactly(
                        new CertificationNode(2L, "정보처리기사"),
                        new CertificationNode(1L, "SQLD"));
    }

    @Test
    void prerequisiteEdgeOutsideSelectionIsIgnored() {
        stubCertifications(SQLD, JEONGBO);
        // SANUP(3L)은 이번 선택(1L,2L)에 없으므로 이 엣지는 무시되어야 한다
        // (PrerequisiteGraph는 선택 범위 밖 노드를 참조하는 엣지를 거부하기 때문에 반드시 필터링해야 함).
        when(certificationPrerequisiteRepository.findAll()).thenReturn(List.of(
                CertificationPrerequisite.builder()
                        .prerequisiteCertification(SANUP)
                        .certification(SQLD)
                        .build()));

        TopologicalSortResult result = service.computeOrder(List.of(1L, 2L));

        assertThat(result).isInstanceOf(TopologicalSortResult.Sorted.class);
        assertThat(((TopologicalSortResult.Sorted) result).order())
                .containsExactly(
                        new CertificationNode(1L, "SQLD"),
                        new CertificationNode(2L, "정보처리기사"));
    }

    @Test
    void cycleAmongSelectedCertificationsIsDetected() {
        stubCertifications(SQLD, JEONGBO);
        when(certificationPrerequisiteRepository.findAll()).thenReturn(List.of(
                CertificationPrerequisite.builder().prerequisiteCertification(SQLD).certification(JEONGBO).build(),
                CertificationPrerequisite.builder().prerequisiteCertification(JEONGBO).certification(SQLD).build()));

        TopologicalSortResult result = service.computeOrder(List.of(1L, 2L));

        assertThat(result).isInstanceOf(TopologicalSortResult.CycleDetected.class);
        assertThat(((TopologicalSortResult.CycleDetected) result).stuckNodes())
                .containsExactlyInAnyOrder(
                        new CertificationNode(1L, "SQLD"),
                        new CertificationNode(2L, "정보처리기사"));
    }

    @Test
    void missingCertificationIdThrowsNotFound() {
        when(certificationRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.computeOrder(List.of(999L)))
                .isInstanceOf(CertificationNotFoundException.class);
    }

    private void stubCertifications(Certification... certifications) {
        for (Certification certification : certifications) {
            when(certificationRepository.findById(certification.getId())).thenReturn(Optional.of(certification));
        }
    }
}
