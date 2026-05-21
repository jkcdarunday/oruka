# AGENTS.md

## Purpose and scope
- `oruka` is a minimal Electron wrapper around `https://messenger.com` for Linux desktop usage.
- Runtime logic is centralized in `index.js`; there is no renderer source tree or preload script.
- Packaging/distribution config lives in `package.json` (`electron-builder`) and outputs Linux artifacts.

## Big-picture architecture
- Main process bootstraps everything from `index.js`: process flags -> singleton lock -> app/window/tray lifecycle.
- App lifecycle is intentionally tray-first:
  - Window close is intercepted and converted to hide (`win.on('close')`).
  - Real shutdown requires `exiting = true` (`Quit` tray action or Ctrl/Cmd+Q handler).
- Browser content is remote-only (`win.loadURL('https://messenger.com')`), so feature work usually means changing BrowserWindow options, event hooks, or tray behavior.
- External links are explicitly rerouted to system browser via `win.webContents.setWindowOpenHandler` + `shell.openExternal`.

## Developer workflows
- Install deps: `npm install`
- Run locally: `npm start`
- Start hidden to tray: `npm start -- --hidden` (checked via `process.argv.includes('--hidden')`)
- Build Linux packages (`pacman`, `AppImage`, `deb`): `npm run build`
- Dockerized reproducible build: `./build-docker.sh` (uses `electronuserland/builder:wine`, mounts `.cache` and project dir)
- There is no test suite configured in `package.json`; validate behavior by launching the app and manually checking tray/show/hide/quit flows.

## Project-specific conventions
- Keep implementation in CommonJS style (`require`, `type: "commonjs"`), consistent with `index.js`.
- Preserve single-instance behavior (`app.requestSingleInstanceLock()` and `second-instance` handler) when changing startup.
- For Linux runtime flags, existing code appends Chromium switches early; keep new switches near current command-line setup block.
- UI labels/tooltips are currently Messenger-branded (`title`, tray tooltip/menu labels); keep wording consistent unless intentionally rebranding.
- Icon path logic must work both packaged and dev (`app.isPackaged ? app.getAppPath() : __dirname`).

## Integration points and dependencies
- External service boundary: Messenger web app at `messenger.com`.
- Electron APIs in active use: `app`, `BrowserWindow`, `Tray`, `Menu`, `shell`.
- Build tooling: `electron` and `electron-builder` only; no framework layer (React/Vue/etc.).
- Linux desktop dependency: tray/appindicator support varies by environment (see troubleshooting notes in `README.md`).

## Safe-change checklist for agents
- If modifying close/quit behavior, verify all three paths still work: tray `Quit`, Ctrl/Cmd+Q, window close-to-hide.
- If modifying window creation, verify `--hidden` still starts without showing the window.
- If modifying link handling, verify popup/new-window URLs still open in external browser and are denied in-app.
- If changing packaging config, ensure `npm run build` still targets `pacman`, `AppImage`, and `deb`.
