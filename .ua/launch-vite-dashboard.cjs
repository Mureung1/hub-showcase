const fs = require("fs");
const { spawn } = require("child_process");

const [projectRoot, dashboardDir, viteEntry, stdoutPath, stderrPath] =
  process.argv.slice(2);
fs.writeFileSync(stdoutPath, "");
fs.writeFileSync(stderrPath, "");
const stdout = fs.openSync(stdoutPath, "a");
const stderr = fs.openSync(stderrPath, "a");
const child = spawn(process.execPath, [viteEntry, "--host", "127.0.0.1"], {
  cwd: dashboardDir,
  detached: true,
  env: { ...process.env, GRAPH_DIR: projectRoot },
  windowsHide: true,
  stdio: ["ignore", stdout, stderr],
});
child.unref();
process.stdout.write(`${child.pid}\n`);
