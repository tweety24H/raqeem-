// Kills stale processes that would otherwise block a fresh `electron:dev`
// run: any leftover packaged app window, and whatever is listening on the
// dev ports (4310 = API server, 5173 = Vite client) — that covers a
// previous `npm run dev` (or `server:dev`/`client:dev`) left running,
// however it was launched (node, nodemon, vite, ...). Electron's own
// server (required in-process from electron/main.js) is unaffected since
// it hasn't started yet when this runs. Never touches unrelated processes.
const { execSync } = require('child_process');

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch (e) {
    // no matching process — nothing to kill, that's fine
  }
}

run('taskkill /F /IM electron.exe');
run('taskkill /F /IM Raqeem.exe');

// No double quotes inside the PowerShell command below — it has to survive
// being re-quoted by cmd.exe (execSync's default shell on Windows).
const psFilter =
  "Get-NetTCPConnection -LocalPort 4310,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }";
run(`powershell -NoProfile -Command "${psFilter}"`);
