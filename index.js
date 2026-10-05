const { app, shell, BrowserWindow, Tray, Menu, session, nativeImage } = require('electron');
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

// Restore window when clicking Dock icon on macOS
app.on('activate', () => {
  showWindow();
});

// Ensure window is allowed to close during app quit on all platforms
app.on('before-quit', () => {
  exiting = true;
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
const messengerUrl = 'https://www.messenger.com/';

const isInternalUrl = (url) => {
  if (typeof url !== 'string') return false;
  if (url.startsWith('about:blank') || url.startsWith('about:srcdoc') || url.startsWith('blob:')) {
    return true;
  }
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'messenger.com' ||
      host.endsWith('.messenger.com') ||
      host === 'facebook.com' ||
      host.endsWith('.facebook.com') ||
      host === 'fbcdn.net' ||
      host.endsWith('.fbcdn.net')
    );
  } catch {
    return false;
  }
};

let exiting = false
let win, tray;
app.whenReady().then(() => {
  // Grant media permissions for Messenger calls (mic, camera, notifications)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL();
    if (isInternalUrl(url) && ['media', 'mediaKeySystem', 'notifications'].includes(permission)) {
      return callback(true);
    }
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const url = webContents ? webContents.getURL() : '';
    return isInternalUrl(url) && ['media', 'mediaKeySystem', 'notifications'].includes(permission);
  });

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
  let errorPageTimer = null;
  let errorPageUrl = '';

  const clearErrorPageTimer = () => {
    if (errorPageTimer === null) return;
    clearTimeout(errorPageTimer);
    errorPageTimer = null;
  };

  const showLoadError = (errorCode, errorDescription) => {
    clearErrorPageTimer();
    // Defer navigation until Chromium has finished processing the failed load.
    errorPageTimer = setTimeout(() => {
      errorPageTimer = null;
      if (exiting || !hasPageError || !win || win.isDestroyed()) return;
      const details = `${errorDescription} (${errorCode})`.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      })[character]);
      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
  <title>Messenger — Connection problem</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: Canvas; color: CanvasText; }
    main { max-width: 420px; padding: 32px; text-align: center; }
    h1 { font-size: 26px; }
    p { line-height: 1.6; }
    .button { display: inline-block; margin: 12px 0; padding: 12px 24px; border-radius: 8px; background: #0866ff; color: white; text-decoration: none; font-weight: 600; }
    .button:focus-visible { outline: 3px solid CanvasText; outline-offset: 4px; }
    small { display: block; margin-top: 16px; opacity: .7; }
  </style>
</head>
<body>
  <main>
    <h1>Couldn't connect to Messenger</h1>
    <p>Check your internet connection or DNS settings, then try again.</p>
    <a class="button" href="${messengerUrl}">Try again</a>
    <p>Oruka will also retry automatically.</p>
    <small>${details}</small>
  </main>
</body>
</html>`;
      errorPageUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      win.loadURL(errorPageUrl).catch((error) => {
        console.error('[oruka] could not display connection error', error);
      });
    }, 0);
  };

  const clearReloadTimer = () => {
    if (!reloadTimer) return;
    clearTimeout(reloadTimer);
    reloadTimer = null;
  };

  const scheduleReload = (reason, options = {}) => {
    const immediate = options.immediate === true;
    if (exiting || !win || win.isDestroyed()) return;
    if (reloadTimer) {
      if (!immediate) return;
      clearReloadTimer();
    }

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
    // Loading the fallback page must not count as a successful Messenger load.
    if (hasPageError || win.webContents.getURL() === errorPageUrl) return;
    reloadAttempt = 0;
    clearReloadTimer();
  });

  win.webContents.on('did-navigate', (_event, url, httpResponseCode) => {
    if (!isInternalUrl(url) || httpResponseCode < 200 || httpResponseCode >= 400) return;
    hasPageError = false;
    reloadAttempt = 0;
    clearReloadTimer();
    clearErrorPageTimer();
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (win.webContents.getURL() !== errorPageUrl || url !== messengerUrl) return;
    event.preventDefault();
    scheduleReload('retry-button', { immediate: true });
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    // Ignore our fallback page; failures of Messenger itself need recovery.
    if (validatedURL === errorPageUrl) return;
    hasPageError = true;
    console.error(`[oruka] load failed (${errorCode}) ${errorDescription}: ${validatedURL}`);
    scheduleReload(`did-fail-load:${errorCode}`);
    showLoadError(errorCode, errorDescription);
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

  // Handle new windows (such as Messenger call popups) and external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          icon,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Ensure child windows also open external links in system browser
  win.webContents.on('did-create-window', (childWindow) => {
    childWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (isInternalUrl(url)) {
        return { action: 'allow' };
      }
      shell.openExternal(url);
      return { action: 'deny' };
    });
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

  // Setup macOS application menu with native roles and shortcuts
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          ...(!app.isPackaged ? [{ role: 'toggleDevTools' }] : []),
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { role: 'close' },
          { type: 'separator' },
          { role: 'front' },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  // Setup tray icon
  const trayIcon = process.platform === 'darwin'
    ? nativeImage.createFromPath(icon).resize({ width: 18, height: 18 })
    : icon;
  tray = new Tray(trayIcon);
  tray.setToolTip('Messenger');

  // Tray icon left click toggles hide
  tray.on('click', () => {
    if (!win.isVisible() || !win.isFocused()) showWindow();
    else win.hide();
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

  win.on('closed', () => {
    clearReloadTimer();
    clearErrorPageTimer();
  });

  win.loadURL(messengerUrl).catch((error) => {
    console.error('[oruka] initial load failed', error);
  });
});
