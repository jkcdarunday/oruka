const { app, shell, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path')

// Allow only a single instance
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
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
let exiting = false
let win, tray;
app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    title: 'Messenger',
    icon: path.join(__dirname, 'icon.png'),
    show: !hidden,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableBlinkFeatures: 'WebAuthentication,WebAuthn,WebAuthnCable,U2F,Notification,MiddleClickAutoscroll',
    },
  });

  // Open links in external browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Setup tray icon
  tray = new Tray('icon.png');
  tray.setToolTip('Messenger');

  // Tray icon left click toggles hide
  tray.on('click', () => {
    if (win.isVisible()) win.hide();
    else {
      win.show();
      win.focus();
    }
  });

  // Tray icon right click shows context menu
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => win.show() },
    { label: 'Hide', click: () => win.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => { exiting = true; app.quit() }},
  ]);
  tray.setContextMenu(contextMenu);

  // Hide on close
  win.on('close', (e) => {
    if (!exiting) {
      e.preventDefault();
      win.hide();
    }
  });

  win.loadURL('https://messenger.com');
});
