<div align="center">
  <img src="icon.png" alt="Oruka Icon" width="128" height="128">
  <h1>Oruka</h1>
  <p>A simple Meta Messenger desktop app for Linux</p>
</div>

## About
Oruka is a lightweight Electron-based desktop application that wraps Meta Messenger (messenger.com) in a native desktop experience. It provides a dedicated messenger window with system tray integration, making it easy to access your conversations without opening a web browser.

## Features

- 🖥️ **Native Desktop Experience** - Dedicated window for Meta Messenger
- 🔔 **System Tray Integration** - Minimize to tray and quick access from taskbar
- 🚀 **Single Instance** - Only one instance runs at a time
- 🎨 **Wayland Support** - Optimized for modern Linux display servers
- ⚡ **Performance Optimized** - GPU acceleration and zero-copy rendering
- 🔗 **External Link Handling** - Opens links in your default browser
- 👁️ **Launch Hidden** - Start minimized to tray with `--hidden` flag

## Installation

### Prerequisites
- Node.js (v16 or higher)
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

### Build Packages
Build distributable packages for Linux:

```bash
npm run build
```

This will generate:
- Pacman package (`.pacman`)
- AppImage (`.AppImage`)
- Debian package (`.deb`)

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
./oruka --hidden
```

### Tray Icon Controls
- **Left Click** - Toggle show/hide window
- **Right Click** - Open context menu with Show, Hide, and Quit options

### Keyboard Shortcuts
The app uses standard Electron/Chromium shortcuts. The menu bar is auto-hidden but can be accessed with the `Alt` key.

## Development

### Project Structure

```
oruka/
├── index.js          # Main Electron application
├── package.json      # Project configuration
├── icon.png          # Application icon
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
