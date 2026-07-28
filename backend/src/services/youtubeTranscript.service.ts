import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

interface YoutubeTranscriptProcess {
  stdout: NodeJS.ReadableStream;
  kill: () => boolean;
  once(
    event: "error",
    listener: (error: Error) => void,
  ): this;
  once(
    event: "close",
    listener: (code: number | null) => void,
  ): this;
}

interface SpawnYoutubeTranscriptOptions {
  shell: false;
  windowsHide: true;
}

export type SpawnYoutubeTranscriptProcess = (
  command: string,
  args: readonly string[],
  options: SpawnYoutubeTranscriptOptions,
) => YoutubeTranscriptProcess;

export interface RunYoutubeTranscriptOptions {
  videoId: string;
  pythonExecutable: string;
  scriptPath: string;
  spawnProcess?: SpawnYoutubeTranscriptProcess;
  timeoutMs: number;
  maxOutputLength: number;
}

export class YoutubeTranscriptError extends Error {
  constructor() {
    super("YOUTUBE_TRANSCRIPT_FAILED");
  }
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const defaultSpawnProcess: SpawnYoutubeTranscriptProcess = (
  command,
  args,
  options,
) =>
  spawn(command, [...args], {
    shell: options.shell,
    windowsHide: options.windowsHide,
    stdio: ["ignore", "pipe", "ignore"],
  });

export function runYoutubeTranscript({
  videoId,
  pythonExecutable,
  scriptPath,
  spawnProcess = defaultSpawnProcess,
  timeoutMs,
  maxOutputLength,
}: RunYoutubeTranscriptOptions): Promise<string> {
  if (
    !YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ||
    !pythonExecutable.trim() ||
    !scriptPath.trim() ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    !Number.isSafeInteger(maxOutputLength) ||
    maxOutputLength <= 0
  ) {
    return Promise.reject(new YoutubeTranscriptError());
  }

  return new Promise((resolve, reject) => {
    const decoder = new StringDecoder("utf8");
    let output = "";
    let isSettled = false;

    const childProcess = spawnProcess(
      pythonExecutable,
      [scriptPath, videoId],
      {
        shell: false,
        windowsHide: true,
      },
    );

    const timeoutId = setTimeout(() => {
      childProcess.kill();

      if (!isSettled) {
        isSettled = true;
        reject(new YoutubeTranscriptError());
      }
    }, timeoutMs);

    function rejectTranscript() {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeoutId);
      reject(new YoutubeTranscriptError());
    }

    childProcess.stdout.on(
      "data",
      (chunk: Buffer | string) => {
        if (isSettled) {
          return;
        }

        output += decoder.write(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
        );

        if (output.length > maxOutputLength) {
          childProcess.kill();
          rejectTranscript();
        }
      },
    );

    childProcess.once("error", rejectTranscript);

    childProcess.once("close", (code) => {
      if (isSettled) {
        return;
      }

      output += decoder.end();

      if (code !== 0 || !output.trim()) {
        rejectTranscript();
        return;
      }

      isSettled = true;
      clearTimeout(timeoutId);
      resolve(output.trim());
    });
  });
}
