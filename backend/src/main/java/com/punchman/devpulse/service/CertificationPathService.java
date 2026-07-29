package com.punchman.devpulse.service;

import com.punchman.devpulse.pathfinder.CertificationNode;
import com.punchman.devpulse.pathfinder.PrerequisiteEdge;
import com.punchman.devpulse.pathfinder.PrerequisiteGraph;
import com.punchman.devpulse.pathfinder.TopologicalSortResult;
import com.punchman.devpulse.pathfinder.TopologicalSorter;
import com.punchman.devpulse.repository.jpa.CertificationPrerequisiteRepository;
import com.punchman.devpulse.repository.jpa.CertificationRepository;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CertificationPathService {

    private final CertificationRepository certificationRepository;
    private final CertificationPrerequisiteRepository certificationPrerequisiteRepository;

    @Transactional(readOnly = true)
    public TopologicalSortResult computeOrder(List<Long> certificationIds) {
        List<CertificationNode> nodes = certificationIds.stream()
                .map(id -> certificationRepository.findById(id)
                        .orElseThrow(() -> new CertificationNotFoundException(id)))
                .map(c -> new CertificationNode(c.getId(), c.getName()))
                .toList();

        Set<Long> selectedIds = Set.copyOf(certificationIds);
        List<PrerequisiteEdge> edges = certificationPrerequisiteRepository.findAll().stream()
                .filter(p -> selectedIds.contains(p.getPrerequisiteCertification().getId())
                        && selectedIds.contains(p.getCertification().getId()))
                .map(p -> new PrerequisiteEdge(
                        p.getPrerequisiteCertification().getId(), p.getCertification().getId()))
                .toList();

        return new TopologicalSorter().sort(PrerequisiteGraph.of(nodes, edges));
    }
}
