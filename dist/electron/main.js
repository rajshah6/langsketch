"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
// Set app name BEFORE anything else
electron_1.app.setName('LangSketch');
// Set process title as well
process.title = 'LangSketch';
// Set app user model ID
electron_1.app.setAppUserModelId('com.langsketch.app');
// Disable hardware acceleration to fix GPU issues in WSL
if (process.platform === 'linux' || process.env.NODE_ENV === 'development') {
    electron_1.app.disableHardwareAcceleration();
}
// Get the icon path - use the 512x512 icon for best quality
const iconPath = (0, path_1.join)(__dirname, '../../public/icon.iconset/icon_512x512.png');
// Set app icon for the dock (must be done before app is ready)
if (process.platform === 'darwin' && electron_1.app.dock) {
    electron_1.app.dock.setIcon(iconPath);
}
const isDev = process.env.NODE_ENV === 'development';
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1000,
        height: 700,
        title: 'LangSketch',
        frame: false,
        icon: iconPath,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: (0, path_1.join)(__dirname, 'preload.js'),
        },
    });
    // Set window title explicitly
    win.setTitle('LangSketch');
    // Set the app icon for the dock again after window creation
    if (process.platform === 'darwin' && electron_1.app.dock) {
        electron_1.app.dock.setIcon(iconPath);
    }
    if (isDev) {
        win.loadURL('http://localhost:3000');
        win.webContents.openDevTools();
        // Add dev debugging
        win.webContents.on('did-finish-load', () => {
            console.log('Renderer loaded:', win.webContents.getURL());
        });
        win.webContents.on('render-process-gone', (_, details) => {
            console.error('Renderer crashed:', details);
        });
    }
    else {
        win.loadFile((0, path_1.join)(__dirname, '../renderer/index.html'));
    }
    // Listen for window state changes and notify renderer
    win.on('maximize', () => {
        console.log('Window maximized');
        win.webContents.send('window-state-changed', 'maximized');
    });
    win.on('unmaximize', () => {
        console.log('Window unmaximized');
        win.webContents.send('window-state-changed', 'restored');
    });
    win.on('restore', () => {
        console.log('Window restored');
        win.webContents.send('window-state-changed', 'restored');
    });
    win.on('move', () => {
        // When window is moved, check if it's still maximized
        setTimeout(() => {
            if (win.isMaximized()) {
                win.webContents.send('window-state-changed', 'maximized');
            }
            else {
                win.webContents.send('window-state-changed', 'restored');
            }
        }, 50);
    });
}
// Handle window control events
electron_1.ipcMain.handle('minimize-window', (event) => {
    const win = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (win)
        win.minimize();
});
electron_1.ipcMain.handle('maximize-window', (event) => {
    const win = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (win) {
        try {
            if (win.isMaximized()) {
                win.unmaximize();
                // Ensure the window is actually unmaximized
                setTimeout(() => {
                    if (win.isMaximized()) {
                        win.unmaximize();
                    }
                }, 50);
            }
            else {
                win.maximize();
                // Ensure the window is actually maximized
                setTimeout(() => {
                    if (!win.isMaximized()) {
                        win.maximize();
                    }
                }, 50);
            }
        }
        catch (error) {
            console.error('Error toggling window state:', error);
        }
    }
});
electron_1.ipcMain.handle('close-window', (event) => {
    const win = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (win)
        win.close();
});
electron_1.ipcMain.handle('get-window-state', (event) => {
    const win = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (win) {
        return win.isMaximized() ? 'maximized' : 'restored';
    }
    return 'restored';
});
electron_1.ipcMain.handle('open-folder-dialog', async (event) => {
    const win = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (win) {
        try {
            const result = await electron_1.dialog.showOpenDialog(win, {
                properties: ['openDirectory'],
                title: 'Select Project Folder',
                buttonLabel: 'Open Project'
            });
            return result;
        }
        catch (error) {
            console.error('Error opening folder dialog:', error);
            return { canceled: true, filePaths: [] };
        }
    }
    return { canceled: true, filePaths: [] };
});
electron_1.app.whenReady().then(() => {
    // Reinforce the app name when ready
    electron_1.app.setName('LangSketch');
    process.title = 'LangSketch';
    // For macOS, set the app icon again when ready
    if (process.platform === 'darwin' && electron_1.app.dock) {
        electron_1.app.dock.setIcon(iconPath);
    }
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
