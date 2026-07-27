// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parsePackageJsonDependencies, parseDockerComposeImages } from './dependencyExtractor.js';

describe('parsePackageJsonDependencies', () => {
  it('dependencies와 devDependencies를 합쳐서 이름만 뽑는다', () => {
    const content = JSON.stringify({
      dependencies: { express: '^4.19.2', react: '^19.2.7' },
      devDependencies: { vitest: '^4.1.10' },
    });
    expect(parsePackageJsonDependencies(content)).toEqual(['express', 'react', 'vitest']);
  });

  it('깨진 JSON이면 빈 배열을 반환한다', () => {
    expect(parsePackageJsonDependencies('{ not valid json')).toEqual([]);
  });

  it('dependencies/devDependencies가 없으면 빈 배열을 반환한다', () => {
    expect(parsePackageJsonDependencies(JSON.stringify({ name: 'foo' }))).toEqual([]);
  });
});

describe('parseDockerComposeImages', () => {
  it('image: postgres:14 에서 postgres만 추출한다', () => {
    const content = `services:\n  db:\n    image: postgres:14\n`;
    expect(parseDockerComposeImages(content)).toEqual(['postgres']);
  });

  it('네임스페이스가 있는 이미지(bitnami/redis:7)에서 redis만 추출한다', () => {
    const content = `services:\n  cache:\n    image: bitnami/redis:7\n`;
    expect(parseDockerComposeImages(content)).toEqual(['redis']);
  });

  it('따옴표로 감싼 image: "mysql:8" 도 처리한다', () => {
    const content = `services:\n  db:\n    image: "mysql:8"\n`;
    expect(parseDockerComposeImages(content)).toEqual(['mysql']);
  });

  it('image: 줄이 없으면 빈 배열을 반환한다', () => {
    const content = `services:\n  app:\n    build: .\n`;
    expect(parseDockerComposeImages(content)).toEqual([]);
  });
});
