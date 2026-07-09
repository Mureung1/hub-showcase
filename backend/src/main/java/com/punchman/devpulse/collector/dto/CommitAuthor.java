package com.punchman.devpulse.collector.dto;

public record CommitAuthor(String name, GitHubUser user) {

    public String resolvedLogin() {
        if (user != null && user.login() != null) {
            return user.login();
        }
        return name;
    }
}
