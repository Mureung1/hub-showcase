package com.placepick.recommendation.domain.candidate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Objects;

/** Internal, deterministic candidate identity. It must never be exposed as a public resource ID. */
public record CandidateKey(String value) implements Comparable<CandidateKey> {

    public CandidateKey {
        Objects.requireNonNull(value, "value");
        if (!value.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Candidate key must be a lowercase SHA-256 value.");
        }
    }

    public static CandidateKey fromIdentity(String identity) {
        Objects.requireNonNull(identity, "identity");
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return new CandidateKey(HexFormat.of().formatHex(
                digest.digest(identity.getBytes(StandardCharsets.UTF_8))
            ));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 must be available in Java 17.", exception);
        }
    }

    @Override
    public int compareTo(CandidateKey other) {
        return value.compareTo(other.value);
    }
}
