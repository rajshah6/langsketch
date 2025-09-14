const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const DatabricksClient = require("./js/analytics/databricks.js");

// Analytics is now integrated as a tab in the main window

// Global Databricks client instance
let databricksClient = null;

// Initialize Databricks connection
async function initializeDatabricks() {
  try {
    databricksClient = new DatabricksClient();
    const connected = await databricksClient.connect();
    if (connected) {
      console.log("Databricks client initialized successfully");
    } else {
      console.log("Databricks client initialization failed - using mock data");
      databricksClient = null; // Set to null to use fallback data
    }
  } catch (error) {
    console.error("Error initializing Databricks client:", error);
    databricksClient = null; // Set to null to use fallback data
  }
}

// Set app name BEFORE anything else (most important!)
app.setName("LangSketch");

// Set process title as well
process.title = "LangSketch";

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

// Analytics is now embedded as a tab in the main window
// No separate window creation needed

// IPC handler for getting Databricks config
ipcMain.handle("get-databricks-config", async () => {
  return {
    success: true,
    config: {
      databricks: {
        serverHostname:
          process.env.DATABRICKS_SERVER_HOSTNAME ||
          "your-databricks-workspace-url",
        httpPath: process.env.DATABRICKS_HTTP_PATH || "your-http-path",
        accessToken:
          process.env.DATABRICKS_ACCESS_TOKEN || "your-personal-access-token",
        catalog: process.env.DATABRICKS_CATALOG || "main",
        schema: process.env.DATABRICKS_SCHEMA || "default",
      },
      table: {
        agentExecutions: "agent_executions",
      },
    },
  };
});

// IPC handler for getting available tables
ipcMain.handle("get-available-tables", async () => {
  try {
    if (databricksClient) {
      const tables = await databricksClient.getAvailableTables();
      return {
        success: true,
        data: tables.map((table) => ({
          name: table.name,
          createTime: table.createTime,
        })),
      };
    } else {
      // Fallback to mock data if Databricks is not connected
      return {
        success: true,
        data: [
          { name: "test_table", createTime: null },
          { name: "test_table2", createTime: null },
          { name: "test_table3", createTime: null },
        ],
      };
    }
  } catch (error) {
    console.error("Error getting available tables:", error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
});

// IPC handler for querying a specific table
ipcMain.handle("query-table", async (event, tableName, limit = 100) => {
  try {
    if (databricksClient) {
      const data = await databricksClient.queryTable(tableName, limit);
      return {
        success: true,
        data: data,
      };
    } else {
      // Generate realistic mock data based on the table name
      const mockData = generateMockTableData(tableName, limit);
      return {
        success: true,
        data: mockData,
      };
    }
  } catch (error) {
    console.error("Error querying table:", error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
});

// Function to generate realistic mock data based on table name
function generateMockTableData(tableName, limit = 100) {
  const baseTime = Date.now() / 1000;
  const data = [];

  for (let i = 0; i < Math.min(limit, 10); i++) {
    const executionTime = baseTime - i * 3600; // Each record 1 hour apart
    const isSuccess = Math.random() > 0.1; // 90% success rate

    let agentName, toolsUsed, modelUsed;

    // Different data patterns based on table name
    if (tableName === "test_table") {
      agentName = "DataProcessorAgent";
      toolsUsed = "Data_Processor,JSON_Parser,Text_Summary";
      modelUsed = "gpt-3.5-turbo-0125";
    } else if (tableName === "test_table2") {
      agentName = "AnalyticsAgent";
      toolsUsed = "Data_Processor,Unit_Converter,Text_Summary";
      modelUsed = "gpt-4";
    } else if (tableName === "test_table3") {
      agentName = "AdvancedAnalyticsAgent";
      toolsUsed = "Data_Processor,Unit_Converter,Text_Summary,JSON_Parser";
      modelUsed = "claude-3-sonnet";
    } else {
      agentName = "GenericAgent";
      toolsUsed = "Text_Summary,Unit_Converter";
      modelUsed = "gpt-3.5-turbo-0125";
    }

    const duration = Math.random() * 15 + 1; // 1-16 seconds
    const tokens = Math.floor(Math.random() * 5000) + 1000;
    const cost = tokens * 0.0000015; // Approximate cost per token

    data.push({
      agent_name: agentName,
      execution_timestamp: executionTime,
      execution_date: new Date(executionTime * 1000)
        .toISOString()
        .split("T")[0],
      execution_hour: new Date(executionTime * 1000)
        .toTimeString()
        .split(" ")[0],
      execution_duration_ms: duration * 1000,
      execution_duration_seconds: duration,
      success: isSuccess,
      error_message: isSuccess ? "" : "Processing timeout",
      error_type: isSuccess ? "" : "timeout",
      total_events: Math.floor(Math.random() * 8) + 2,
      total_tool_calls: Math.floor(Math.random() * 4) + 1,
      total_llm_calls: Math.floor(Math.random() * 3) + 1,
      avg_tool_call_duration_ms: Math.random() * 3000 + 500,
      avg_llm_call_duration_ms: Math.random() * 2000 + 1000,
      total_tokens_used: tokens,
      prompt_tokens_used: Math.floor(tokens * 0.7),
      completion_tokens_used: Math.floor(tokens * 0.3),
      tokens_per_second: tokens / duration,
      cost_estimate_usd: cost,
      tools_used_count: toolsUsed.split(",").length,
      tools_used_list: toolsUsed,
      most_used_tool: toolsUsed.split(",")[0],
      most_used_tool_count: Math.floor(Math.random() * 3) + 1,
      tool_names: toolsUsed,
      tool_call_ids: `call_${Math.random().toString(36).substr(2, 9)}`,
      tool_call_timestamps: executionTime.toString(),
      llm_model_used: modelUsed,
      llm_finish_reasons: isSuccess ? "stop" : "length",
      llm_call_timestamps: executionTime.toString(),
      input_size_chars: Math.floor(Math.random() * 2000) + 500,
      input_fields_count: Math.floor(Math.random() * 5) + 1,
      has_array_input: Math.random() > 0.5,
      agent_description: `This agent processes data from ${tableName} and performs various operations.`,
      available_tools_count: toolsUsed.split(",").length,
      available_tools_list: toolsUsed,
      utilities_enabled: toolsUsed.toLowerCase().replace(/_/g, "_"),
      apis_configured: Math.floor(Math.random() * 3),
      tools_per_second: Math.random() * 2 + 0.1,
      events_per_second: Math.random() * 1 + 0.1,
      efficiency_score: Math.random() * 0.4 + 0.6, // 60-100%
      has_validation_errors: !isSuccess,
      output_validation_success: isSuccess,
      llm_errors: isSuccess ? 0 : 1,
      tool_errors: isSuccess ? 0 : Math.floor(Math.random() * 2),
      raw_input_data: `{"input": "sample data for ${tableName}", "timestamp": ${executionTime}}`,
      execution_sequence: toolsUsed.replace(/,/g, "->"),
      tableName: tableName,
    });
  }

  return data;
}

// IPC handler for getting latest execution
ipcMain.handle("get-latest-execution", async () => {
  try {
    if (databricksClient) {
      const data = await databricksClient.getLatestExecution();
      return {
        success: true,
        data: data,
      };
    } else {
      // Generate realistic mock data for latest execution
      const mockData = generateMockTableData("test_table", 1);
      return {
        success: true,
        data: mockData[0] || {
          agent_name: "DataProcessorAgent",
          execution_timestamp: Date.now() / 1000,
          execution_date: new Date().toISOString().split("T")[0],
          execution_duration_seconds: 8.5,
          success: true,
          total_events: 6,
          total_tool_calls: 3,
          total_llm_calls: 2,
          total_tokens_used: 2850,
          cost_estimate_usd: 0.00428,
          efficiency_score: 0.75,
          most_used_tool: "Data_Processor",
          llm_model_used: "gpt-3.5-turbo-0125",
          tokens_per_second: 335.29,
          prompt_tokens_used: 1995,
          completion_tokens_used: 855,
          tools_used_list: "Data_Processor,JSON_Parser,Text_Summary",
          tool_names: "Data_Processor,JSON_Parser,Text_Summary",
          llm_finish_reasons: "stop",
          output_validation_success: true,
        },
      };
    }
  } catch (error) {
    console.error("Error getting latest execution:", error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
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

  // Initialize Databricks connection
  await initializeDatabricks();

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
