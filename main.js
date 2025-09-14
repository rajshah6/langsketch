const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// Keep track of analytics window
let analyticsWindow = null;

// Set app name BEFORE anything else (most important!)
app.setName('LangSketch');

// Set process title as well
process.title = 'LangSketch';

// Set app user model ID
app.setAppUserModelId('com.langsketch.app');

// Get the icon path - use the 512x512 icon for best quality
const iconPath = path.join(__dirname, 'public', 'icon.iconset', 'icon_512x512.png');

// Set app icon for the dock (must be done before app is ready)
if (process.platform === 'darwin') {
  // Set the dock icon using the 512x512 icon
  app.dock.setIcon(iconPath);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'LangSketch',
    frame: false, // Remove default window frame
    icon: iconPath, // Set app icon for dock using 512x512 icon
    webPreferences: {
      nodeIntegration: true, // allows Node.js APIs in renderer
      contextIsolation: false, // needed for require to work
      enableRemoteModule: true, // enables remote module for file operations
    },
  });

  // Set window title explicitly
  win.setTitle('LangSketch');
  
  // Set the app icon for the dock again after window creation
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath);
  }
  
  win.loadFile('index.html'); // load your frontend

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
      } else {
        win.webContents.send('window-state-changed', 'restored');
      }
    }, 50);
  });
}

// Handle window control events
ipcMain.handle('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
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
      } else {
        win.maximize();
        // Ensure the window is actually maximized
        setTimeout(() => {
          if (!win.isMaximized()) {
            win.maximize();
          }
        }, 50);
      }
    } catch (error) {
      console.error('Error toggling window state:', error);
    }
  }
});

ipcMain.handle('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('get-window-state', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    return win.isMaximized() ? 'maximized' : 'restored';
  }
  return 'restored';
});

ipcMain.handle('open-folder-dialog', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    try {
      const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory'],
        title: 'Select Project Folder',
        buttonLabel: 'Open Project'
      });
      return result;
    } catch (error) {
      console.error('Error opening folder dialog:', error);
      return { canceled: true, filePaths: [] };
    }
  }
  return { canceled: true, filePaths: [] };
});

// Analytics window creation
function createAnalyticsWindow(projectPath) {
  // If analytics window already exists, focus it and update project path
  if (analyticsWindow && !analyticsWindow.isDestroyed()) {
    analyticsWindow.focus();
    analyticsWindow.webContents.send('init-analytics', { projectPath });
    return;
  }

  analyticsWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'LangSketch - Analytics Dashboard',
    icon: iconPath,
    autoHideMenuBar: true,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  analyticsWindow.loadFile('analytics/index.html');

  // Show window when ready to prevent flash
  analyticsWindow.once('ready-to-show', () => {
    analyticsWindow.show();
    // Send initialization data
    analyticsWindow.webContents.send('init-analytics', { projectPath });
  });

  // Clean up reference when window is closed
  analyticsWindow.on('closed', () => {
    analyticsWindow = null;
  });
}

// IPC handler for opening analytics
ipcMain.on('open-analytics', (event, data) => {
  createAnalyticsWindow(data.projectPath);
});

// IPC handler for getting Databricks config (placeholder)
ipcMain.handle('get-databricks-config', async () => {
  // This would read from the main app's credential storage
  // For now, return default config structure
  return {
    success: true,
    config: {
      databricks: {
        serverHostname: "your-databricks-workspace-url",
        httpPath: "your-http-path",
        accessToken: "your-personal-access-token",
        catalog: "main",
        schema: "default",
      },
      table: {
        agentExecutions: "agent_executions",
      },
    },
  };
});

// IPC handler for getting available tables (placeholder)
ipcMain.handle('get-available-tables', async () => {
  // This would query Databricks for available tables
  // For now, return mock data
  return {
    success: true,
    data: ["agent_executions", "test_table", "analytics_data"],
  };
});

app.whenReady().then(() => {
  // Reinforce the app name when ready
  app.setName('LangSketch');
  process.title = 'LangSketch';
  
  // For macOS, set the app icon again when ready
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath);
  }
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
