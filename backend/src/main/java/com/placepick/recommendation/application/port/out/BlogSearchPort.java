package com.placepick.recommendation.application.port.out;

public interface BlogSearchPort {

    BlogSearchResult searchBlogs(BlogSearchQuery query);
}
