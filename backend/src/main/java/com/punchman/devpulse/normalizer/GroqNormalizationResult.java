package com.punchman.devpulse.normalizer;

import java.util.List;

public record GroqNormalizationResult(List<PostingMatch> results) {

    public record PostingMatch(int postingIndex, List<CertificationMatch> matches) {
    }

    public record CertificationMatch(String certificationName, String field) {
    }
}
