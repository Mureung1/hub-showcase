package com.tapha.hub.auth.application;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.tapha.hub.auth.presentation.InvalidGoogleCredentialException;

@Component
public class GoogleIdentityVerifier {

    private final GoogleIdTokenVerifier verifier;

    public GoogleIdentityVerifier(@Value("${app.auth.google.client-id:}") String clientId) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(List.of(clientId))
                .build();
    }

    public GoogleIdentity verify(String credential) {
        try {
            GoogleIdToken token = verifier.verify(credential);
            if (token == null) {
                throw new InvalidGoogleCredentialException();
            }
            GoogleIdToken.Payload payload = token.getPayload();
            if (payload.getSubject() == null || payload.getSubject().isBlank()) {
                throw new InvalidGoogleCredentialException();
            }
            return new GoogleIdentity(payload.getSubject(), payload.getEmail(), (String) payload.get("name"));
        } catch (GeneralSecurityException | IOException exception) {
            throw new InvalidGoogleCredentialException();
        }
    }
}
