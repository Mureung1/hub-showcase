package com.tapha.hub.book.application;

import java.util.List;

public interface BookMetadataClient {

    List<BookMetadata> search(String query);

    BookMetadata get(String providerId);
}
