const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const DatabricksClient = require("./databricks-client");

// Set app name BEFORE anything else (most important!)
app.setName("LangSketch");

// Set process title as well
process.title = "LangSketch";

// Initialize Databricks client
const databricksClient = new DatabricksClient();

// Set app user model ID
app.setAppUserModelId("com.langsketch.app");

// Get the icon path - use the 512x512 icon for best quality
const iconPath = path.join(
  __dirname,
  "public",
  "icon.iconset",
  "icon_512x512.png"
);

// Set app icon for the dock (must be done before app is ready)
if (process.platform === "darwin") {
  // Set the dock icon using the 512x512 icon
  app.dock.setIcon(iconPath);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    title: "LangSketch",
    frame: false, // Remove default window frame
    icon: iconPath, // Set app icon for dock using 512x512 icon
    webPreferences: {
      nodeIntegration: true, // allows Node.js APIs in renderer
      contextIsolation: false, // needed for require to work
      enableRemoteModule: true, // enables remote module for file operations
    },
  });

  // Set window title explicitly
  win.setTitle("LangSketch");

  // Set the app icon for the dock again after window creation
  if (process.platform === "darwin") {
    app.dock.setIcon(iconPath);
  }

  win.loadFile("index.html"); // load your frontend

  // Listen for window state changes and notify renderer
  win.on("maximize", () => {
    console.log("Window maximized");
    win.webContents.send("window-state-changed", "maximized");
  });

  win.on("unmaximize", () => {
    console.log("Window unmaximized");
    win.webContents.send("window-state-changed", "restored");
  });

  win.on("restore", () => {
    console.log("Window restored");
    win.webContents.send("window-state-changed", "restored");
  });

  win.on("move", () => {
    // When window is moved, check if it's still maximized
    setTimeout(() => {
      if (win.isMaximized()) {
        win.webContents.send("window-state-changed", "maximized");
      } else {
        win.webContents.send("window-state-changed", "restored");
      }
    }, 50);
  });
}

// Handle window control events
ipcMain.handle("minimize-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle("maximize-window", (event) => {
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
      console.error("Error toggling window state:", error);
    }
  }
});

ipcMain.handle("close-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle("get-window-state", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    return win.isMaximized() ? "maximized" : "restored";
  }
  return "restored";
});

ipcMain.handle("open-folder-dialog", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    try {
      const result = await dialog.showOpenDialog(win, {
        properties: ["openDirectory"],
        title: "Select Project Folder",
        buttonLabel: "Open Project",
      });
      return result;
    } catch (error) {
      console.error("Error opening folder dialog:", error);
      return { canceled: true, filePaths: [] };
    }
  }
  return { canceled: true, filePaths: [] };
});

// Databricks IPC handlers
ipcMain.handle("get-latest-execution", async () => {
  try {
    if (!databricksClient.connection) {
      return { success: false, error: "Databricks not connected" };
    }
    const data = await databricksClient.getLatestExecution();
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching latest execution:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(
  "get-agent-execution",
  async (event, agentName, executionDate) => {
    try {
      const data = await databricksClient.getAgentExecution(
        agentName,
        executionDate
      );
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching agent execution:", error);
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle("get-execution-stats", async (event, days = 7) => {
  try {
    const data = await databricksClient.getExecutionStats(days);
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching execution stats:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-tool-usage-stats", async (event, days = 7) => {
  try {
    const data = await databricksClient.getToolUsageStats(days);
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching tool usage stats:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-agent-performance", async (event, agentName, days = 30) => {
  try {
    const data = await databricksClient.getAgentPerformanceOverTime(
      agentName,
      days
    );
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching agent performance:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-all-executions", async (event, limit = 100) => {
  try {
    const data = await databricksClient.getAllAgentExecutions(limit);
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching all executions:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-available-tables", async () => {
  try {
    if (!databricksClient.connection) {
      return { success: false, error: "Databricks not connected" };
    }
    const data = await databricksClient.getAvailableTables();
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching available tables:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("query-table", async (event, tableName, limit = 100) => {
  try {
    if (!databricksClient.connection) {
      return { success: false, error: "Databricks not connected" };
    }
    const data = await databricksClient.queryTable(tableName, limit);
    return { success: true, data };
  } catch (error) {
    console.error("Error querying table:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-table-schema", async (event, tableName) => {
  try {
    if (!databricksClient.connection) {
      return { success: false, error: "Databricks not connected" };
    }
    const data = await databricksClient.getTableSchema(tableName);
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching table schema:", error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  // Reinforce the app name when ready
  app.setName("LangSketch");
  process.title = "LangSketch";

  // For macOS, set the app icon again when ready
  if (process.platform === "darwin") {
    app.dock.setIcon(iconPath);
  }

  createWindow();

  // Initialize Databricks connection
  try {
    await databricksClient.connect();
    console.log("Databricks connected successfully");
  } catch (error) {
    console.error("Failed to connect to Databricks:", error);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Cleanup on app quit
app.on("before-quit", async () => {
  try {
    await databricksClient.disconnect();
  } catch (error) {
    console.error("Error disconnecting from Databricks:", error);
  }
});
