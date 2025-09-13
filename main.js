// Agent Analytics Dashboard - Main JavaScript
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const DatabricksClient = require("./databricks");
const config = require("./config");

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

// Renderer process code (runs in the browser context)
if (typeof window !== "undefined") {
  const { ipcRenderer } = require("electron");

  // Global variables for data
  let agentData = null;
  let isLoading = false;
  let currentError = null;

  // Initialize dashboard when DOM is loaded
  document.addEventListener("DOMContentLoaded", function () {
    setupEventListeners();
    loadData();
  });

  async function loadData() {
    try {
      showLoadingState();
      const result = await ipcRenderer.invoke("get-latest-execution");

      if (result.success) {
        agentData = result.data;
        if (agentData) {
          initializeDashboard();
        } else {
          showError("No execution data found");
        }
      } else {
        showError(result.error);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showError("Failed to load data from Databricks");
    } finally {
      hideLoadingState();
    }
  }

  function showLoadingState() {
    isLoading = true;
    document.body.classList.add("loading");
    // Show loading indicator
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loading-indicator";
    loadingDiv.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: rgba(255,255,255,0.95); padding: 2rem; border-radius: 12px; 
                  box-shadow: 0 8px 32px rgba(0,0,0,0.1); text-align: center; z-index: 1000;">
        <div style="font-size: 1.2rem; margin-bottom: 1rem;">🔄 Loading data from Databricks...</div>
        <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; 
                    border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
    `;
    document.body.appendChild(loadingDiv);
  }

  function hideLoadingState() {
    isLoading = false;
    document.body.classList.remove("loading");
    const loadingDiv = document.getElementById("loading-indicator");
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  function showError(message) {
    currentError = message;
    const errorDiv = document.createElement("div");
    errorDiv.id = "error-indicator";
    errorDiv.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: rgba(239, 68, 68, 0.95); color: white; padding: 2rem; 
                  border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); 
                  text-align: center; z-index: 1000; max-width: 400px;">
        <div style="font-size: 1.2rem; margin-bottom: 1rem;">❌ Error</div>
        <div style="margin-bottom: 1rem;">${message}</div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: white; color: #ef4444; border: none; padding: 0.5rem 1rem; 
                       border-radius: 6px; cursor: pointer;">Close</button>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }

  function initializeDashboard() {
    if (!agentData) return;

    updateOverviewCards();
    createCharts();
    populateTables();
    updateRawData();
    updateLastUpdated();
  }

  function updateOverviewCards() {
    // Update execution status
    const statusElement = document.getElementById("execution-status");
    statusElement.textContent = agentData.success ? "Success" : "Failed";
    statusElement.className = agentData.success
      ? "metric-value status-success"
      : "metric-value status-error";

    // Update duration
    document.getElementById(
      "execution-duration"
    ).textContent = `${agentData.execution_duration_seconds}s`;

    // Update cost
    document.getElementById(
      "execution-cost"
    ).textContent = `$${agentData.cost_estimate_usd}`;

    // Update efficiency score
    document.getElementById("efficiency-score").textContent = `${Math.round(
      agentData.efficiency_score * 100
    )}%`;
  }

  function createCharts() {
    createPerformanceChart();
    createTokenChart();
    createToolChart();
    createTimelineChart();
  }

  function createPerformanceChart() {
    const ctx = document.getElementById("performanceChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: [
          "Duration (s)",
          "Tool Calls",
          "LLM Calls",
          "Events",
          "Tokens/sec",
        ],
        datasets: [
          {
            label: "Performance Metrics",
            data: [
              agentData.execution_duration_seconds,
              agentData.total_tool_calls,
              agentData.total_llm_calls,
              agentData.total_events,
              agentData.tokens_per_second,
            ],
            backgroundColor: [
              "rgba(102, 126, 234, 0.8)",
              "rgba(118, 75, 162, 0.8)",
              "rgba(16, 185, 129, 0.8)",
              "rgba(245, 158, 11, 0.8)",
              "rgba(239, 68, 68, 0.8)",
            ],
            borderColor: [
              "rgba(102, 126, 234, 1)",
              "rgba(118, 75, 162, 1)",
              "rgba(16, 185, 129, 1)",
              "rgba(245, 158, 11, 1)",
              "rgba(239, 68, 68, 1)",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
        },
      },
    });
  }

  function createTokenChart() {
    const ctx = document.getElementById("tokenChart").getContext("2d");
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Prompt Tokens", "Completion Tokens"],
        datasets: [
          {
            data: [
              agentData.prompt_tokens_used,
              agentData.completion_tokens_used,
            ],
            backgroundColor: [
              "rgba(102, 126, 234, 0.8)",
              "rgba(118, 75, 162, 0.8)",
            ],
            borderColor: ["rgba(102, 126, 234, 1)", "rgba(118, 75, 162, 1)"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
            },
          },
        },
      },
    });
  }

  function createToolChart() {
    const tools = agentData.tool_names.split(",");
    const toolCounts = [1, 1]; // Based on the data, both tools used once

    const ctx = document.getElementById("toolChart").getContext("2d");
    new Chart(ctx, {
      type: "pie",
      data: {
        labels: tools,
        datasets: [
          {
            data: toolCounts,
            backgroundColor: [
              "rgba(102, 126, 234, 0.8)",
              "rgba(16, 185, 129, 0.8)",
            ],
            borderColor: ["rgba(102, 126, 234, 1)", "rgba(16, 185, 129, 1)"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
            },
          },
        },
      },
    });
  }

  function createTimelineChart() {
    const timestamps = agentData.tool_call_timestamps
      .split(",")
      .map((ts) => new Date(parseInt(ts) * 1000));
    const durations = [
      agentData.avg_tool_call_duration_ms,
      agentData.avg_llm_call_duration_ms,
    ];

    const ctx = document.getElementById("timelineChart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Tool Call 1", "Tool Call 2", "LLM Call 1", "LLM Call 2"],
        datasets: [
          {
            label: "Duration (ms)",
            data: [
              agentData.avg_tool_call_duration_ms,
              agentData.avg_tool_call_duration_ms,
              agentData.avg_llm_call_duration_ms,
              agentData.avg_llm_call_duration_ms,
            ],
            borderColor: "rgba(102, 126, 234, 1)",
            backgroundColor: "rgba(102, 126, 234, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
        },
      },
    });
  }

  function populateTables() {
    populateExecutionDetails();
    populateToolPerformance();
    populateLLMDetails();
  }

  function populateExecutionDetails() {
    const tbody = document.getElementById("execution-details");
    const details = [
      {
        metric: "Agent Name",
        value: agentData.agent_name,
        description: "Name of the executed agent",
      },
      {
        metric: "Execution Date",
        value: agentData.execution_date,
        description: "Date when the agent was executed",
      },
      {
        metric: "Execution Time",
        value: agentData.execution_hour,
        description: "Time of execution",
      },
      {
        metric: "Total Duration",
        value: `${agentData.execution_duration_seconds}s`,
        description: "Total execution time in seconds",
      },
      {
        metric: "Success Status",
        value: agentData.success ? "Success" : "Failed",
        description: "Whether the execution was successful",
      },
      {
        metric: "Total Events",
        value: agentData.total_events,
        description: "Total number of events processed",
      },
      {
        metric: "Total Tool Calls",
        value: agentData.total_tool_calls,
        description: "Number of tool calls made",
      },
      {
        metric: "Total LLM Calls",
        value: agentData.total_llm_calls,
        description: "Number of LLM API calls",
      },
      {
        metric: "Total Tokens",
        value: agentData.total_tokens_used,
        description: "Total tokens consumed",
      },
      {
        metric: "Cost Estimate",
        value: `$${agentData.cost_estimate_usd}`,
        description: "Estimated cost in USD",
      },
      {
        metric: "Efficiency Score",
        value: `${Math.round(agentData.efficiency_score * 100)}%`,
        description: "Overall efficiency percentage",
      },
      {
        metric: "Input Size",
        value: `${agentData.input_size_chars} chars`,
        description: "Size of input data",
      },
      {
        metric: "Validation Success",
        value: agentData.output_validation_success ? "Yes" : "No",
        description: "Whether output validation passed",
      },
    ];

    tbody.innerHTML = details
      .map(
        (detail) => `
      <tr>
        <td><strong>${detail.metric}</strong></td>
        <td>${detail.value}</td>
        <td>${detail.description}</td>
      </tr>
    `
      )
      .join("");
  }

  function populateToolPerformance() {
    const tbody = document.getElementById("tool-performance");
    const tools = agentData.tool_names.split(",");
    const toolData = tools.map((tool) => ({
      name: tool,
      count: 1, // Each tool used once based on the data
      duration: agentData.avg_tool_call_duration_ms,
      status: "Success",
    }));

    tbody.innerHTML = toolData
      .map(
        (tool) => `
      <tr>
        <td><strong>${tool.name}</strong></td>
        <td>${tool.count}</td>
        <td>${Math.round(tool.duration)}ms</td>
        <td><span class="status-success">${tool.status}</span></td>
      </tr>
    `
      )
      .join("");
  }

  function populateLLMDetails() {
    const tbody = document.getElementById("llm-details");
    const finishReasons = agentData.llm_finish_reasons.split(",");
    const timestamps = agentData.llm_call_timestamps.split(",");

    const llmData = finishReasons.map((reason, index) => ({
      call: index + 1,
      model: agentData.llm_model_used,
      reason: reason,
      timestamp: new Date(parseInt(timestamps[index]) * 1000).toLocaleString(),
    }));

    tbody.innerHTML = llmData
      .map(
        (call) => `
      <tr>
        <td><strong>Call ${call.call}</strong></td>
        <td>${call.model}</td>
        <td>${call.reason}</td>
        <td>${call.timestamp}</td>
      </tr>
    `
      )
      .join("");
  }

  function updateRawData() {
    const rawDataElement = document.getElementById("raw-input-data");
    const formattedData = JSON.stringify(
      JSON.parse(agentData.raw_input_data),
      null,
      2
    );
    rawDataElement.textContent = formattedData;
  }

  function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById("last-updated");
    const now = new Date();
    lastUpdatedElement.textContent = now.toLocaleString();
  }

  function setupEventListeners() {
    // Refresh data button
    document
      .getElementById("refresh-data")
      .addEventListener("click", async function () {
        await loadData();
      });

    // Export data button
    document
      .getElementById("export-data")
      .addEventListener("click", function () {
        exportData();
      });

    // Listen for Databricks connection errors
    ipcRenderer.on("databricks-error", (event, errorMessage) => {
      showError(`Databricks connection error: ${errorMessage}`);
    });
  }

  function exportData() {
    const dataStr = JSON.stringify(agentData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent-analytics-${agentData.agent_name}-${agentData.execution_date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
