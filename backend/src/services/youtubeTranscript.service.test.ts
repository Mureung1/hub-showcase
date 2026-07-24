import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import {
  runYoutubeTranscript,
  type SpawnYoutubeTranscriptProcess,
  YoutubeTranscriptError,
} from "./youtubeTranscript.service.js";

test("검증된 video ID를 shell 없이 Python 프로세스에 전달한다", async () => {
  let capturedCommand = "";
  let capturedArgs: readonly string[] = [];
  let capturedShell: boolean | undefined;

  const spawnProcess = ((
    command: string,
    args: readonly string[],
    options: { shell: false },
  ) => {
    capturedCommand = command;
    capturedArgs = args;
    capturedShell = options.shell;

    const childProcess = new EventEmitter() as EventEmitter & {
      stdout: PassThrough;
      kill: () => boolean;
    };

    childProcess.stdout = new PassThrough();
    childProcess.kill = () => true;

    queueMicrotask(() => {
      childProcess.stdout.end("김치 200g\n10분간 끓인다.");
      childProcess.emit("close", 0);
    });

    return childProcess;
  }) as SpawnYoutubeTranscriptProcess;

  const transcript = await runYoutubeTranscript({
    videoId: "dQw4w9WgXcQ",
    pythonExecutable: "python",
    scriptPath: "scripts/fetchYoutubeTranscript.py",
    spawnProcess,
    timeoutMs: 10_000,
    maxOutputLength: 20_000,
  });

  assert.equal(transcript, "김치 200g\n10분간 끓인다.");
  assert.equal(capturedCommand, "python");
  assert.deepEqual(capturedArgs, [
    "scripts/fetchYoutubeTranscript.py",
    "dQw4w9WgXcQ",
  ]);
  assert.equal(capturedShell, false);
});

test("여러 stdout chunk로 나뉜 UTF-8 자막을 보존한다", async () => {
  const spawnProcess = (() => {
    const childProcess = new EventEmitter() as EventEmitter & {
      stdout: PassThrough;
      kill: () => boolean;
    };

    childProcess.stdout = new PassThrough();
    childProcess.kill = () => true;

    queueMicrotask(() => {
      const encodedTranscript = Buffer.from("김치");

      childProcess.stdout.write(encodedTranscript.subarray(0, 1));
      childProcess.stdout.end(encodedTranscript.subarray(1));
      childProcess.emit("close", 0);
    });

    return childProcess;
  }) as SpawnYoutubeTranscriptProcess;

  const transcript = await runYoutubeTranscript({
    videoId: "dQw4w9WgXcQ",
    pythonExecutable: "python",
    scriptPath: "scripts/fetchYoutubeTranscript.py",
    spawnProcess,
    timeoutMs: 10_000,
    maxOutputLength: 20_000,
  });

  assert.equal(transcript, "김치");
});

test("자막 프로세스 timeout 시 프로세스를 종료하고 실패한다", async () => {
  let wasKilled = false;

  const spawnProcess = (() => {
    const childProcess = new EventEmitter() as EventEmitter & {
      stdout: PassThrough;
      kill: () => boolean;
    };

    childProcess.stdout = new PassThrough();
    childProcess.kill = () => {
      wasKilled = true;
      return true;
    };

    return childProcess;
  }) as SpawnYoutubeTranscriptProcess;

  await assert.rejects(
    runYoutubeTranscript({
      videoId: "dQw4w9WgXcQ",
      pythonExecutable: "python",
      scriptPath: "scripts/fetchYoutubeTranscript.py",
      spawnProcess,
      timeoutMs: 1,
      maxOutputLength: 20_000,
    }),
    YoutubeTranscriptError,
  );

  assert.equal(wasKilled, true);
});

test("20,000자를 초과한 자막 출력을 중단한다", async () => {
  let wasKilled = false;

  const spawnProcess = (() => {
    const childProcess = new EventEmitter() as EventEmitter & {
      stdout: PassThrough;
      kill: () => boolean;
    };

    childProcess.stdout = new PassThrough();
    childProcess.kill = () => {
      wasKilled = true;
      return true;
    };

    queueMicrotask(() => {
      childProcess.stdout.end("가".repeat(20_001));
      childProcess.emit("close", 0);
    });

    return childProcess;
  }) as SpawnYoutubeTranscriptProcess;

  await assert.rejects(
    runYoutubeTranscript({
      videoId: "dQw4w9WgXcQ",
      pythonExecutable: "python",
      scriptPath: "scripts/fetchYoutubeTranscript.py",
      spawnProcess,
      timeoutMs: 10_000,
      maxOutputLength: 20_000,
    }),
    YoutubeTranscriptError,
  );

  assert.equal(wasKilled, true);
});

for (const scenario of [
  { name: "자막 없음", output: "", exitCode: 0 },
  { name: "YouTube 차단", output: "", exitCode: 1 },
]) {
  test(`${scenario.name}을 자막 조회 실패로 처리한다`, async () => {
    const spawnProcess = (() => {
      const childProcess = new EventEmitter() as EventEmitter & {
        stdout: PassThrough;
        kill: () => boolean;
      };

      childProcess.stdout = new PassThrough();
      childProcess.kill = () => true;

      queueMicrotask(() => {
        childProcess.stdout.end(scenario.output);
        childProcess.emit("close", scenario.exitCode);
      });

      return childProcess;
    }) as SpawnYoutubeTranscriptProcess;

    await assert.rejects(
      runYoutubeTranscript({
        videoId: "dQw4w9WgXcQ",
        pythonExecutable: "python",
        scriptPath: "scripts/fetchYoutubeTranscript.py",
        spawnProcess,
        timeoutMs: 10_000,
        maxOutputLength: 20_000,
      }),
      YoutubeTranscriptError,
    );
  });
}
