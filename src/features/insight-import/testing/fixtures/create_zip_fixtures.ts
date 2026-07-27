import {
  BlobWriter,
  TextReader,
  ZipWriter,
  type ZipWriterAddDataOptions,
} from '@zip.js/zip.js';

export type ZipFixtureEntry = {
  content?: string;
  name: string;
  options?: ZipWriterAddDataOptions;
};

export async function createZipFixture(entries: ZipFixtureEntry[]) {
  const blobWriter = new BlobWriter('application/zip');
  const writer = new ZipWriter(blobWriter);

  for (const { content = '', name, options } of entries) {
    await writer.add(name, new TextReader(content), options);
  }

  return writer.close();
}
