<div align="center">
  <img src="icon.png" alt="Oruka Icon" width="128" height="128">
  <h1>Oruka</h1>
  <p>A simple Meta Messenger desktop app for Linux & macOS</p>
</div>

## About
Oruka is a lightweight Electron-based desktop application that wraps Meta Messenger (messenger.com) in a native desktop experience. It provides a dedicated messenger window with system tray and dock integration, making it easy to access your conversations without opening a web browser.

## Features

- 🖥️ **Native Desktop Experience** - Dedicated window for Meta Messenger
- 🔔 **System Tray Integration** - Minimize to tray and quick access from taskbar / menu bar
- 🍏 **macOS Support** - Native Dock activation, top menu bar with native shortcuts, and camera/mic permissions
- 🚀 **Single Instance** - Only one instance runs at a time
- 🎨 **Wayland Support** - Optimized for modern Linux display servers
- ⚡ **Performance Optimized** - GPU acceleration and zero-copy rendering
- 🔗 **External Link Handling** - Opens links in your default browser
- 👁️ **Launch Hidden** - Start minimized to tray with `--hidden` flag

## Installation

### Prerequisites
- Node.js (v22.12.0 or higher, required for source installation and builds)
- npm or yarn

### From Source

1. Clone the repository:
```bash
git clone https://github.com/jkcdarunday/oruka.git
cd oruka
```

2. Install dependencies:
```bash
npm install
```

3. Run the application:
```bash
npm start
```

### macOS Release Installation

macOS release builds are available for Intel (`x64`) and Apple Silicon (`arm64`) Macs. Choose the download matching your Mac's processor. Open the `.dmg` and drag Oruka into Applications, or extract the `.zip` and move Oruka into Applications.

macOS releases are currently not Developer ID signed or notarized, so Gatekeeper may block the first launch. If you trust the download, follow [Apple's instructions for opening an app from an unidentified developer](https://support.apple.com/en-us/102445). Node.js is not required to run a packaged release.

### Build Packages
Build distributable packages:

#### For Linux:
```bash
npm run build:linux
# or on Linux: npm run build
```
This generates:
- Pacman package (`.pacman`)
- AppImage (`.AppImage`)
- Debian package (`.deb`)

#### For macOS:
```bash
npm run build:mac
# or on macOS: npm run build
```
This generates:
- Apple Disk Image (`.dmg`)
- Zip archive (`.zip`)

Run macOS builds on a Mac. Both `npm run build:mac` and the GitHub Actions macOS job generate separate packages for Intel and Apple Silicon by default, with `x64` or `arm64` in each filename. To build only one architecture:

```bash
npx electron-builder --mac dmg zip --x64
# or for Apple Silicon only:
npx electron-builder --mac dmg zip --arm64
```

For a single app supporting both architectures:

```bash
npx electron-builder --mac dmg zip --universal
```

The built packages will be available in the `dist` directory.

## Usage
### Running the App
```bash
npm start
```

### Launch Hidden (Minimized to Tray)
```bash
npm start -- --hidden
```

Or if running the built executable:

```bash
# Linux
./oruka --hidden

# macOS
open -a Oruka --args --hidden
```

### Tray and Dock Controls
- **Left Click (Tray)** - Toggle show/hide window
- **Right Click (Tray)** - Open context menu with Show, Hide, and Quit options
- **Dock Icon (macOS)** - Click to restore and bring window to focus

### Keyboard Shortcuts
- **Quit** - `Ctrl+Q` on Linux, `Cmd+Q` on macOS
- **Close Window** - `Cmd+W` on macOS (hides window to background/tray)
- **Menu Bar** - Auto-hidden on Linux (press `Alt`), native top menu bar on macOS

## Development

### Project Structure

```
oruka/
├── index.js          # Main Electron application
├── package.json      # Project configuration
├── icon.png          # Application icon
├── build/entitlements.mac.plist # macOS app and helper entitlements
├── build-docker.sh   # Docker build script
└── README.md         # This file
```

### Building with Docker
A Docker build script is provided for reproducible builds:

```bash
./build-docker.sh
```

## Contributing
Contributions are welcome! Please feel free to submit issues and pull requests.

## License
Apache-2.0 License - see the LICENSE file for details.

## Acknowledgments
- Built with [Electron](https://www.electronjs.org/)
- Meta Messenger web interface

## Troubleshooting

### App doesn't start
- Ensure all dependencies are installed: `npm install`
- Check that you have a compatible Node.js version
- Try clearing electron cache: `rm -rf ~/.cache/electron`

### Tray icon not showing
- Some desktop environments require additional extensions for tray support
- On GNOME, install the AppIndicator extension

### Wayland issues
- The app automatically detects and uses Wayland when available
- If issues occur, try forcing X11 mode by setting: `ELECTRON_OZONE_PLATFORM_HINT=x11`

## Support
For bugs and feature requests, please use the [GitHub issue tracker](https://github.com/jkcdarunday/oruka/issues).
