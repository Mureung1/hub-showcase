const fs = require("fs");
const { spawn } = require("child_process");

const [projectRoot, viewerUrl, stdoutPath, stderrPath] = process.argv.slice(2);
fs.writeFileSync(stdoutPath, "");
fs.writeFileSync(stderrPath, "");
const stdout = fs.openSync(stdoutPath, "a");
const stderr = fs.openSync(stderrPath, "a");
const child = spawn("npx", ["--yes", viewerUrl, projectRoot], {
  cwd: projectRoot,
  detached: true,
  shell: true,
  windowsHide: true,
  stdio: ["ignore", stdout, stderr],
});
child.unref();
process.stdout.write(`${child.pid}\n`);
