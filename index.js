const { app, shell, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path')

// Allow only a single instance
let hasPageError = false;
let recoverIfErrored = () => {};

const showWindow = () => {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  recoverIfErrored('show-window');
};

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  showWindow();
});

// Enable Wayland
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations');
  app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}

// Enable File Handling API
app.commandLine.appendSwitch('enable-features', 'FileHandlingAPI');

// Performance optimizations
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

const hidden = process.argv.includes('--hidden')
const icon = path.join(app.isPackaged ? app.getAppPath() : __dirname, 'icon.png');
const messengerUrl = 'https://messenger.com';
let exiting = false
let win, tray;
app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    title: 'Messenger',
    icon,
    show: !hidden,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableBlinkFeatures: 'WebAuthentication,WebAuthn,WebAuthnCable,U2F,Notification,MiddleClickAutoscroll',
    },
  });

  const backoffBaseMs = 2000;
  const backoffMaxMs = 60000;
  let reloadAttempt = 0;
  let reloadTimer = null;

  const clearReloadTimer = () => {
    if (!reloadTimer) return;
    clearTimeout(reloadTimer);
    reloadTimer = null;
  };

  const scheduleReload = (reason, options = {}) => {
    const immediate = options.immediate === true;
    if (exiting || !win || win.isDestroyed() || reloadTimer) return;

    const delay = immediate ? 0 : Math.min(backoffBaseMs * (2 ** reloadAttempt), backoffMaxMs);
    if (!immediate) reloadAttempt += 1;

    console.warn(`[oruka] scheduling reload in ${delay}ms: ${reason}`);
    reloadTimer = setTimeout(() => {
      reloadTimer = null;
      if (exiting || !win || win.isDestroyed()) return;
      win.loadURL(messengerUrl).catch((error) => {
        console.error('[oruka] reload failed', error);
      });
    }, delay);
  };

  recoverIfErrored = (reason) => {
    if (!hasPageError) return;
    scheduleReload(`recover-on-show:${reason}`, { immediate: true });
  };

  win.webContents.on('did-finish-load', () => {
    hasPageError = false;
    reloadAttempt = 0;
    clearReloadTimer();
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    hasPageError = true;
    console.error(`[oruka] load failed (${errorCode}) ${errorDescription}: ${validatedURL}`);
    scheduleReload(`did-fail-load:${errorCode}`);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    hasPageError = true;
    console.error(`[oruka] renderer process gone: ${details.reason}`);
    scheduleReload(`render-process-gone:${details.reason}`);
  });

  win.webContents.on('unresponsive', () => {
    hasPageError = true;
    console.error('[oruka] renderer became unresponsive');
    scheduleReload('unresponsive');
  });

  // Open links in external browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Provide a stable context menu for right-click actions in remote content.
  win.webContents.on('context-menu', (_event, params) => {
    const template = [];

    if (params.linkURL) {
      template.push({
        label: 'Open Link in Browser',
        click: () => shell.openExternal(params.linkURL),
      });
      template.push({ type: 'separator' });
    }

    if (params.isEditable) {
      template.push(
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      );
    } else if (params.selectionText && params.selectionText.trim()) {
      template.push({ role: 'copy' });
    }

    if (!template.length) {
      template.push({ role: 'copy' });
    }

    if (!app.isPackaged) {
      template.push(
        { type: 'separator' },
        {
          label: 'Inspect Element',
          click: () => win.webContents.inspectElement(params.x, params.y),
        },
      );
    }

    Menu.buildFromTemplate(template).popup({ window: win });
  });

  // Setup tray icon
  tray = new Tray(icon);
  tray.setToolTip('Messenger');

  // Tray icon left click toggles hide
  tray.on('click', () => {
    if (win.isVisible()) win.hide();
    else showWindow();
  });

  // Tray icon right click shows context menu
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => showWindow() },
    { label: 'Hide', click: () => win.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => { exiting = true; app.quit() }},
  ]);
  tray.setContextMenu(contextMenu);

  // Ctrl+q or Cmd+q to quit
  win.webContents.on('before-input-event', (event, input) => {
    const modifier = process.platform === 'darwin' ? input.meta : input.control;
    if (modifier && input.key.toLowerCase() === 'q') {
      event.preventDefault();
      exiting = true;
      app.quit();
    }
  });

  // Hide on close
  win.on('close', (e) => {
    if (!exiting) {
      e.preventDefault();
      win.hide();
    }
  });

  win.loadURL(messengerUrl);
});
