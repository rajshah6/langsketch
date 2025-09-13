// Agent Analytics Dashboard - Main JavaScript
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const DatabricksClient = require("./databricks");

// Try to load config, but don't fail if it doesn't exist
let config;
try {
  config = require("./config");
} catch (error) {
  console.log("Config file not found, using default settings");
  config = {
    databricks: {
      serverHostname: "your-databricks-workspace-url",
      httpPath: "your-http-path",
      accessToken: "your-personal-access-token",
      catalog: "main",
      schema: "default",
    },
  };
}

// Initialize Databricks client
const databricksClient = new DatabricksClient();

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, "assets/icon.png"), // Optional: add an icon
    show: false, // Don't show until ready
  });

  // Load the index.html file
  mainWindow.loadFile("index.html");

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", async () => {
    mainWindow.show();
    // Initialize Databricks connection
    try {
      await databricksClient.connect();
      console.log("Databricks connected successfully");
    } catch (error) {
      console.error("Failed to connect to Databricks:", error);
      // Show error in renderer
      mainWindow.webContents.send("databricks-error", error.message);
    }
  });

  // Open DevTools in development
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on("window-all-closed", () => {
  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS, re-create a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Create application menu
const template = [
  {
    label: "File",
    submenu: [
      {
        label: "Refresh Data",
        accelerator: "CmdOrCtrl+R",
        click: () => {
          mainWindow.webContents.send("refresh-data");
        },
      },
      {
        label: "Export Report",
        accelerator: "CmdOrCtrl+E",
        click: () => {
          mainWindow.webContents.send("export-data");
        },
      },
      { type: "separator" },
      {
        label: "Exit",
        accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
  {
    label: "Window",
    submenu: [{ role: "minimize" }, { role: "close" }],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// IPC handlers for data fetching
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

// Cleanup on app quit
app.on("before-quit", async () => {
  try {
    await databricksClient.disconnect();
  } catch (error) {
    console.error("Error disconnecting from Databricks:", error);
  }
});
