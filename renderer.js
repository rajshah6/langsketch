// Renderer process code (runs in the browser context)
const { ipcRenderer } = require("electron");

// Global variables for data
let agentData = null;
let isLoading = false;
let currentError = null;
let availableTables = [];
let currentTable = null;
let charts = {}; // Store chart instances

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
  setupPageNavigation();
  loadAvailableTables();
  loadData();
});

// Cleanup charts when page is unloaded
window.addEventListener("beforeunload", function () {
  destroyCharts();
});

async function loadAvailableTables() {
  try {
    const result = await ipcRenderer.invoke("get-available-tables");

    if (result.success) {
      availableTables = result.data;
      populateTableSelector();
    } else {
      console.log("Error loading tables:", result.error);
      // Show error in dropdown
      const select = document.getElementById("table-select");
      select.innerHTML = '<option value="">Error loading tables</option>';
    }
  } catch (error) {
    console.error("Error loading available tables:", error);
    const select = document.getElementById("table-select");
    select.innerHTML = '<option value="">Error loading tables</option>';
  }
}

function populateTableSelector() {
  const select = document.getElementById("table-select");

  if (availableTables.length === 0) {
    select.innerHTML = '<option value="">No tables found</option>';
    return;
  }

  select.innerHTML = '<option value="">Select a table...</option>';

  availableTables.forEach((table) => {
    const option = document.createElement("option");
    option.value = table.name;
    option.textContent = table.name;
    select.appendChild(option);
  });

  // Automatically select the first (most recent) table
  if (availableTables.length > 0) {
    select.value = availableTables[0].name;
    currentTable = availableTables[0].name;
    // Trigger data load for the selected table
    loadData();
  }
}

async function loadData() {
  try {
    showLoadingState();

    // If a specific table is selected, load that table's data
    if (currentTable) {
      const result = await ipcRenderer.invoke("query-table", currentTable, 100);

      if (result.success && result.data.length > 0) {
        // Use the first row as the primary data for display
        agentData = result.data[0];
        // Store all data for potential use in charts/tables
        agentData.allRows = result.data;
        agentData.tableName = currentTable;
        initializeDashboard();
      } else {
        console.log("No data found in selected table");
        showError("No data found in the selected table");
      }
    } else {
      // Default behavior - get latest execution (fallback)
      const result = await ipcRenderer.invoke("get-latest-execution");

      if (result.success && result.data) {
        agentData = result.data;
        initializeDashboard();
      } else {
        console.log("No data from Databricks");
        showError(
          "No data available. Please select a table from the dropdown."
        );
      }
    }
  } catch (error) {
    console.error("Error loading data:", error);
  } finally {
    hideLoadingState();
  }
}

function loadSampleData() {
  // Sample data from the JSON provided
  agentData = {
    agent_name: "ConvertMilesStorySummary",
    execution_timestamp: 1757783142,
    execution_date: "2025-09-13",
    execution_hour: "13:00:00",
    execution_duration_ms: 6823.96,
    execution_duration_seconds: 6.824,
    success: true,
    error_message: "",
    error_type: "",
    total_events: 4,
    total_tool_calls: 2,
    total_llm_calls: 2,
    avg_tool_call_duration_ms: 3411.98,
    avg_llm_call_duration_ms: 3411.98,
    total_tokens_used: 2320,
    prompt_tokens_used: 1687,
    completion_tokens_used: 633,
    tokens_per_second: 339.98,
    cost_estimate_usd: 0.00348,
    tools_used_count: 2,
    tools_used_list: "Text_Summary,Unit_Converter",
    most_used_tool: "Unit_Converter",
    most_used_tool_count: 1,
    tool_names: "Unit_Converter,Text_Summary",
    tool_call_ids:
      "call_aS7KhFDjBy0jncuOX0ZnouN7,call_ZIyfp8PXRvBHDpsQ2LWB3dnr",
    tool_call_timestamps: "1757783145,1757783145",
    llm_model_used: "gpt-3.5-turbo-0125",
    llm_finish_reasons: "tool_calls,stop",
    llm_call_timestamps: "1757783145,1757783149",
    input_size_chars: 1367,
    input_fields_count: 2,
    has_array_input: false,
    agent_description:
      "This agent will take the Metres input, and convert it to Miles using the unit_converter. It will also, take the Story and summarize it with the text_summary.",
    available_tools_count: 2,
    available_tools_list: "Text_Summary,Unit_Converter",
    utilities_enabled: "text_summary,unit_converter",
    apis_configured: 0,
    tools_per_second: 0.29,
    events_per_second: 0.59,
    efficiency_score: 0.59,
    has_validation_errors: false,
    output_validation_success: true,
    llm_errors: 0,
    tool_errors: 0,
    raw_input_data:
      "{'Metres': 9, 'Story': 'In a small quiet village there lived a girl who always dreamed of the sea. She had never seen the water with her own eyes yet she felt the waves inside her heart. Each night she imagined a horizon where the sky touched the endless blue and she promised herself that one day she would stand there in the wind and hear the ocean speak. The people of the village often told her that dreams were soft and fragile like clouds. They warned her that travel was hard and the sea was c",
    execution_sequence: "Unit_Converter->Text_Summary",
  };

  initializeDashboard();
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
  updateLastUpdated();
  updateTableInfo();

  // Ensure the active page is visible
  const activePage = document.querySelector(".page.active");
  if (!activePage) {
    document.getElementById("summary-page").classList.add("active");
    document
      .querySelector('.nav-tab[data-page="summary"]')
      .classList.add("active");
  }

  // Populate tables with a small delay to ensure DOM is ready
  setTimeout(() => {
    populateTables();
  }, 100);
}

function updateTableInfo() {
  const footerInfo = document.querySelector(".footer-info span");
  if (currentTable) {
    footerInfo.innerHTML = `Table: ${currentTable} | Last Updated: <span id="last-updated"></span>`;
  } else if (agentData && agentData.tableName) {
    footerInfo.innerHTML = `Table: ${agentData.tableName} | Last Updated: <span id="last-updated"></span>`;
  } else {
    footerInfo.innerHTML = `Agent: ConvertMilesStorySummary | Last Updated: <span id="last-updated"></span>`;
  }
}

function updateOverviewCards() {
  // Update execution status - look for common success indicators
  const statusElement = document.getElementById("execution-status");
  const success =
    agentData.success !== undefined
      ? agentData.success
      : agentData.status === "success"
      ? true
      : agentData.status === "failed"
      ? false
      : true;
  statusElement.textContent = success ? "Success" : "Failed";
  statusElement.className = success
    ? "metric-value status-success"
    : "metric-value status-error";

  // Update duration - look for common duration fields
  const duration =
    agentData.execution_duration_seconds ||
    agentData.duration ||
    agentData.execution_duration ||
    0;
  document.getElementById("execution-duration").textContent = `${duration}s`;

  // Update cost - look for common cost fields
  const cost =
    agentData.cost_estimate_usd || agentData.cost || agentData.cost_usd || 0;
  document.getElementById("execution-cost").textContent = `$${cost}`;

  // Update efficiency score - look for common efficiency fields
  const efficiency =
    agentData.efficiency_score || agentData.efficiency || agentData.score || 0;
  document.getElementById("efficiency-score").textContent = `${Math.round(
    efficiency * 100
  )}%`;

  // Update additional summary details
  updateSummaryDetails();
}

function updateSummaryDetails() {
  // Agent name
  const agentName = agentData.agent_name || agentData.name || "Unknown Agent";
  document.getElementById("agent-name").textContent = agentName;

  // Execution date
  const executionDate = agentData.execution_date || agentData.date || "Unknown";
  document.getElementById("execution-date").textContent = executionDate;

  // Total events
  const totalEvents = agentData.total_events || agentData.events || 0;
  document.getElementById("total-events").textContent = totalEvents;

  // Tools used
  const toolsUsed = agentData.total_tool_calls || agentData.tool_calls || 0;
  document.getElementById("tools-used").textContent = toolsUsed;

  // LLM calls
  const llmCalls = agentData.total_llm_calls || agentData.llm_calls || 0;
  document.getElementById("llm-calls").textContent = llmCalls;

  // Total tokens
  const totalTokens = agentData.total_tokens_used || agentData.tokens || 0;
  document.getElementById("total-tokens").textContent =
    totalTokens.toLocaleString();

  // Tokens per second
  const tokensPerSecond =
    agentData.tokens_per_second || agentData.tokens_per_sec || 0;
  document.getElementById(
    "tokens-per-second"
  ).textContent = `${tokensPerSecond} tokens/sec`;

  // Most used tool
  const mostUsedTool =
    agentData.most_used_tool || agentData.tool_names || "None";
  document.getElementById("most-used-tool").textContent = mostUsedTool;

  // LLM model
  const llmModel = agentData.llm_model_used || agentData.model || "Unknown";
  document.getElementById("llm-model").textContent = llmModel;

  // Validation status
  const validationSuccess =
    agentData.output_validation_success !== undefined
      ? agentData.output_validation_success
      : agentData.validation_success !== undefined
      ? agentData.validation_success
      : true;
  document.getElementById("validation-status").textContent = validationSuccess
    ? "Passed"
    : "Failed";
}

function createCharts() {
  // Destroy existing charts before creating new ones
  destroyCharts();

  createPerformanceChart();
  createTokenChart();
  createTimelineChart();
}

function destroyCharts() {
  Object.values(charts).forEach((chart) => {
    if (chart) {
      chart.destroy();
    }
  });
  charts = {};
}

function createPerformanceChart() {
  const ctx = document.getElementById("performanceChart").getContext("2d");
  charts.performance = new Chart(ctx, {
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
            agentData.execution_duration_seconds || agentData.duration || 0,
            agentData.total_tool_calls || agentData.tool_calls || 0,
            agentData.total_llm_calls || agentData.llm_calls || 0,
            agentData.total_events || agentData.events || 0,
            agentData.tokens_per_second || agentData.tokens_per_sec || 0,
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
  charts.token = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Prompt Tokens", "Completion Tokens"],
      datasets: [
        {
          data: [
            agentData.prompt_tokens_used || agentData.prompt_tokens || 0,
            agentData.completion_tokens_used ||
              agentData.completion_tokens ||
              0,
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

function createTimelineChart() {
  const toolCallTimestamps =
    agentData.tool_call_timestamps || agentData.tool_timestamps || "";
  const timestamps = toolCallTimestamps
    ? toolCallTimestamps.split(",").map((ts) => new Date(parseInt(ts) * 1000))
    : [new Date(), new Date()];

  const avgToolDuration =
    agentData.avg_tool_call_duration_ms || agentData.avg_tool_duration || 0;
  const avgLlmDuration =
    agentData.avg_llm_call_duration_ms || agentData.avg_llm_duration || 0;

  const ctx = document.getElementById("timelineChart").getContext("2d");
  charts.timeline = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Tool Call 1", "Tool Call 2", "LLM Call 1", "LLM Call 2"],
      datasets: [
        {
          label: "Duration (ms)",
          data: [
            avgToolDuration,
            avgToolDuration,
            avgLlmDuration,
            avgLlmDuration,
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
  try {
    populateExecutionDetails();
    populateToolPerformance();
    populateLLMDetails();
  } catch (error) {
    console.error("Error populating tables:", error);
  }
}

function populateExecutionDetails() {
  const tbody = document.getElementById("execution-details");

  if (!tbody) {
    console.error("execution-details tbody not found");
    return;
  }

  // Create a generic details array from the actual data
  const details = [];

  // Add all fields from the data as rows
  Object.keys(agentData).forEach((key) => {
    if (key !== "allRows" && key !== "tableName") {
      const value = agentData[key];
      let displayValue = value;

      // Format the value based on its type
      if (typeof value === "boolean") {
        displayValue = value ? "Yes" : "No";
      } else if (typeof value === "number") {
        if (key.includes("timestamp") || key.includes("time")) {
          displayValue = new Date(value * 1000).toLocaleString();
        } else if (key.includes("cost") || key.includes("price")) {
          displayValue = `$${value}`;
        } else if (key.includes("duration") || key.includes("time")) {
          displayValue = `${value}s`;
        } else if (key.includes("score") || key.includes("rate")) {
          displayValue = `${Math.round(value * 100)}%`;
        } else {
          displayValue = value.toString();
        }
      } else if (typeof value === "string" && value.length > 100) {
        displayValue = value.substring(0, 100) + "...";
      }

      details.push({
        metric: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value: displayValue,
        description: `Field: ${key}`,
      });
    }
  });

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

  if (!tbody) {
    console.error("tool-performance tbody not found");
    return;
  }

  // Look for tool-related fields in the data
  const toolFields = Object.keys(agentData).filter(
    (key) => key.includes("tool") || key.includes("Tool")
  );

  if (toolFields.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4">No tool-related data found</td></tr>';
    return;
  }

  const toolData = toolFields.map((field) => {
    const value = agentData[field];
    let displayValue = value;

    if (typeof value === "string" && value.includes(",")) {
      displayValue = value.split(",").length;
    } else if (typeof value === "number") {
      displayValue = value;
    } else {
      displayValue = value ? "Yes" : "No";
    }

    return {
      name: field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      count: typeof displayValue === "number" ? displayValue : 1,
      duration: field.includes("duration") ? agentData[field] || 0 : "N/A",
      status: "Success",
    };
  });

  tbody.innerHTML = toolData
    .map(
      (tool) => `
    <tr>
      <td><strong>${tool.name}</strong></td>
      <td>${tool.count}</td>
      <td>${
        tool.duration === "N/A" ? "N/A" : Math.round(tool.duration) + "ms"
      }</td>
      <td><span class="status-success">${tool.status}</span></td>
    </tr>
  `
    )
    .join("");
}

function populateLLMDetails() {
  const tbody = document.getElementById("llm-details");

  if (!tbody) {
    console.error("llm-details tbody not found");
    return;
  }

  // Look for LLM-related fields in the data
  const llmFields = Object.keys(agentData).filter(
    (key) =>
      key.includes("llm") ||
      key.includes("LLM") ||
      key.includes("model") ||
      key.includes("Model")
  );

  if (llmFields.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No LLM-related data found</td></tr>';
    return;
  }

  const llmData = llmFields.map((field, index) => {
    const value = agentData[field];
    let displayValue = value;

    if (typeof value === "string" && value.includes(",")) {
      displayValue = value.split(",")[0]; // Take first value if comma-separated
    } else if (typeof value === "number" && field.includes("timestamp")) {
      displayValue = new Date(value * 1000).toLocaleString();
    }

    return {
      call: index + 1,
      model: field.includes("model") ? value : "N/A",
      reason: field.includes("reason") ? value : "N/A",
      timestamp: field.includes("timestamp")
        ? displayValue
        : new Date().toLocaleString(),
    };
  });

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

function updateLastUpdated() {
  const lastUpdatedElement = document.getElementById("last-updated");
  const now = new Date();
  lastUpdatedElement.textContent = now.toLocaleString();
}

function setupPageNavigation() {
  const navTabs = document.querySelectorAll(".nav-tab");
  const pages = document.querySelectorAll(".page");

  navTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const targetPage = this.getAttribute("data-page");

      // Remove active class from all tabs and pages
      navTabs.forEach((t) => t.classList.remove("active"));
      pages.forEach((p) => p.classList.remove("active"));

      // Add active class to clicked tab and corresponding page
      this.classList.add("active");
      document.getElementById(`${targetPage}-page`).classList.add("active");

      // Recreate charts when switching to metrics page
      if (targetPage === "metrics" && agentData) {
        setTimeout(() => {
          createCharts();
        }, 100);
      }

      // Populate tables when switching to tables page
      if (targetPage === "tables" && agentData) {
        setTimeout(() => {
          populateTables();
        }, 100);
      }
    });
  });
}

function setupEventListeners() {
  // Table selector
  document
    .getElementById("table-select")
    .addEventListener("change", async function (event) {
      currentTable = event.target.value;
      if (currentTable) {
        await loadData();
      }
    });

  // Refresh data button
  document
    .getElementById("refresh-data")
    .addEventListener("click", async function () {
      await loadData();
    });

  // Export data button
  document.getElementById("export-data").addEventListener("click", function () {
    exportData();
  });

  // Open Databricks button
  document
    .getElementById("open-databricks")
    .addEventListener("click", function () {
      const { shell } = require("electron");
      shell.openExternal(
        "https://dbc-2f5ab88f-ea86.cloud.databricks.com/explore/data/workspace/default?o=3699346728778382"
      );
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
