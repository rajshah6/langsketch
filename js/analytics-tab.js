// Analytics Tab Component - Integrated Analytics Dashboard
// Embeds the analytics UI as a tab within the main application

(function (global) {
  class AnalyticsTab {
    constructor() {
      // Use shared state
      const S = global.App.state;
      this.S = S;

      // Initialize analytics state in global state
      if (!S.analytics) {
        S.analytics = {
          tables: [],
          activeTable: null,
          cache: { summary: null, metrics: null, tables: null },
          isLoading: false,
          currentError: null,
          agentData: null,
          charts: {},
          fetch: null,
          exportReport: null,
          openDatabricks: null,
        };
      }

      this.initialized = false;
      this.rootEl = null;
    }

    init() {
      if (this.initialized) return;

      // Set up analytics data layer methods
      this.setupDataLayer();
      this.initialized = true;
    }

    setupDataLayer() {
      const S = this.S;

      // Set up fetch method for different views
      S.analytics.fetch = async (view, table) => {
        try {
          S.analytics.isLoading = true;

          if (table && global.ipcRenderer) {
            const result = await global.ipcRenderer.invoke(
              "query-table",
              table,
              100
            );
            if (result.success && result.data.length > 0) {
              const data = result.data[0];
              data.allRows = result.data;
              data.tableName = table;
              return data;
            }
          } else if (global.ipcRenderer) {
            const result = await global.ipcRenderer.invoke(
              "get-latest-execution"
            );
            if (result.success && result.data) {
              return result.data;
            }
          }

          // Fallback to sample data if no IPC available
          return this.getSampleData();
        } catch (error) {
          console.error("Error fetching analytics data:", error);
          S.analytics.currentError = error.message;
          return this.getSampleData();
        } finally {
          S.analytics.isLoading = false;
        }
      };

      // Set up export functionality
      S.analytics.exportReport = () => {
        if (S.analytics.agentData) {
          const dataStr = JSON.stringify(S.analytics.agentData, null, 2);
          const dataUri =
            "data:application/json;charset=utf-8," +
            encodeURIComponent(dataStr);

          const exportFileDefaultName = `agent-analytics-${
            new Date().toISOString().split("T")[0]
          }.json`;

          const linkElement = document.createElement("a");
          linkElement.setAttribute("href", dataUri);
          linkElement.setAttribute("download", exportFileDefaultName);
          linkElement.click();
        }
      };

      // Set up Databricks link functionality
      S.analytics.openDatabricks = () => {
        if (global.require) {
          const { shell } = global.require("electron");
          shell.openExternal(
            "https://dbc-2f5ab88f-ea86.cloud.databricks.com/explore/data/workspace/default?o=3699346728778382"
          );
        } else {
          window.open(
            "https://dbc-2f5ab88f-ea86.cloud.databricks.com/explore/data/workspace/default?o=3699346728778382",
            "_blank"
          );
        }
      };
    }

    render() {
      this.init();

      return `
        <div class="analytics">
          <div class="analytics-subnav">
            <div class="analytics-tabs">
              <button class="analytics-tab active" data-tab="summary">
                <span class="tab-icon">📊</span>
                <span class="tab-text">Summary</span>
              </button>
              <button class="analytics-tab" data-tab="metrics">
                <span class="tab-icon">📈</span>
                <span class="tab-text">Metrics</span>
              </button>
              <button class="analytics-tab" data-tab="tables">
                <span class="tab-icon">📋</span>
                <span class="tab-text">Data Tables</span>
              </button>
            </div>
            <div class="analytics-actions">
              <div class="table-selector">
                <label for="analytics-table-select" class="sr-only">Select Table</label>
                <select id="analytics-table-select" class="analytics-select">
                  <option value="">Loading tables...</option>
                </select>
              </div>
              <button id="analytics-refresh" class="btn btn-primary">
                <i class="fas fa-sync-alt btn-icon"></i>
                Refresh Data
              </button>
              <button id="analytics-export" class="btn btn-secondary">
                <i class="fas fa-download btn-icon"></i>
                Export Report
              </button>
              <button id="analytics-open-db" class="btn btn-secondary">
                <i class="fas fa-external-link-alt btn-icon"></i>
                Open Databricks
              </button>
              <button id="analytics-setup" class="btn btn-accent">
                <i class="fas fa-cog btn-icon"></i>
                Setup Databricks
              </button>
            </div>
          </div>
          <div class="analytics-content">
            <section id="analytics-summary" class="analytics-pane active">
              ${this.buildSummaryHTML()}
            </section>
            <section id="analytics-metrics" class="analytics-pane">
              ${this.buildMetricsHTML()}
            </section>
            <section id="analytics-tables" class="analytics-pane">
              ${this.buildTablesHTML()}
            </section>
          </div>
        </div>`;
    }

    setupEventListeners() {
      if (!this.rootEl) return;

      // Sub-tab switching
      this.rootEl.querySelectorAll(".analytics-tab").forEach((btn) => {
        btn.addEventListener("click", () => this.switchTo(btn.dataset.tab));
      });

      // Actions
      this.rootEl
        .querySelector("#analytics-refresh")
        .addEventListener("click", () => this.refreshCurrent());
      this.rootEl
        .querySelector("#analytics-export")
        .addEventListener("click", () => this.S.analytics.exportReport());
      this.rootEl
        .querySelector("#analytics-open-db")
        .addEventListener("click", () => this.S.analytics.openDatabricks());

      // Table selector
      this.rootEl
        .querySelector("#analytics-table-select")
        .addEventListener("change", (e) => this.onTableChange(e));

      // Setup Databricks button
      this.rootEl
        .querySelector("#analytics-setup")
        .addEventListener("click", () => this.showSetupInstructions());
    }

    async show() {
      const mainContent = document.querySelector(".main-content");
      if (!mainContent) return;

      // Render analytics content
      mainContent.innerHTML = `<div id="analyticsTabContainer">${this.render()}</div>`;

      this.rootEl = document.getElementById("analyticsTabContainer");
      this.setupEventListeners();

      // Load initial data
      await this.loadAvailableTables();
      await this.refreshCurrent();
    }

    switchTo(name) {
      if (!this.rootEl) return;

      this.rootEl
        .querySelectorAll(".analytics-tab")
        .forEach((b) => b.classList.remove("active"));
      this.rootEl
        .querySelector(`.analytics-tab[data-tab="${name}"]`)
        .classList.add("active");

      this.rootEl
        .querySelectorAll(".analytics-pane")
        .forEach((p) => p.classList.remove("active"));
      this.rootEl.querySelector(`#analytics-${name}`).classList.add("active");

      this.renderPane(name);
    }

    async renderPane(name) {
      if (!this.rootEl) return;

      const pane = this.rootEl.querySelector(`#analytics-${name}`);
      if (!pane) return;

      switch (name) {
        case "summary":
          pane.innerHTML = this.buildSummaryHTML();
          break;
        case "metrics":
          pane.innerHTML = this.buildMetricsHTML();
          // Create charts after a short delay to ensure DOM is ready
          setTimeout(() => this.createCharts(), 100);
          break;
        case "tables":
          pane.innerHTML = this.buildTablesHTML();
          break;
      }
    }

    async loadAvailableTables() {
      try {
        if (global.ipcRenderer) {
          const result = await global.ipcRenderer.invoke(
            "get-available-tables"
          );
          if (result.success) {
            this.S.analytics.tables = result.data;
            this.populateTableSelector();
          }
        } else {
          // Fallback - mock tables based on the user's Databricks tables
          this.S.analytics.tables = [
            { name: "test_table", label: "Test Table" },
            { name: "test_table2", label: "Test Table 2" },
            { name: "test_table3", label: "Test Table 3" },
          ];
          this.populateTableSelector();
        }
      } catch (error) {
        console.error("Error loading tables:", error);
        // Fallback to mock tables on error
        this.S.analytics.tables = [
          { name: "test_table", label: "Test Table" },
          { name: "test_table2", label: "Test Table 2" },
          { name: "test_table3", label: "Test Table 3" },
        ];
        this.populateTableSelector();
      }
    }

    populateTableSelector() {
      if (!this.rootEl) return;

      const select = this.rootEl.querySelector("#analytics-table-select");
      if (!select) return;

      select.innerHTML = "";

      if (this.S.analytics.tables.length === 0) {
        select.innerHTML = '<option value="">No tables found</option>';
        return;
      }

      select.innerHTML = '<option value="">Select a table...</option>';
      this.S.analytics.tables.forEach((table) => {
        const option = document.createElement("option");
        option.value = table.name;
        option.textContent = table.label || table.name;
        select.appendChild(option);
      });

      // Auto-select first table
      if (this.S.analytics.tables.length > 0 && !this.S.analytics.activeTable) {
        this.S.analytics.activeTable = this.S.analytics.tables[0].name;
        select.value = this.S.analytics.activeTable;
      }
    }

    async onTableChange(e) {
      this.S.analytics.activeTable = e.target.value;
      await this.refreshCurrent();
    }

    async refreshCurrent() {
      try {
        const activeTab =
          this.rootEl?.querySelector(".analytics-tab.active")?.dataset.tab ||
          "summary";
        const data = await this.S.analytics.fetch(
          activeTab,
          this.S.analytics.activeTable
        );

        this.S.analytics.agentData = data;
        this.S.analytics.cache[activeTab] = data;

        this.renderPane(activeTab);
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    }

    showSetupInstructions() {
      const instructions = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
                    align-items: center; justify-content: center;">
          <div style="background: white; padding: 2rem; border-radius: 12px; 
                      max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <h2>🔧 Databricks Setup Instructions</h2>
            <p>To connect to your real Databricks data, follow these steps:</p>
            
            <h3>1. Get Your Credentials</h3>
            <ul>
              <li><strong>Server Hostname:</strong> Your Databricks workspace URL (e.g., adb-1234567890123456.7.azuredatabricks.net)</li>
              <li><strong>HTTP Path:</strong> Go to SQL Warehouses → Your Warehouse → Connection Details</li>
              <li><strong>Access Token:</strong> Go to User Settings → Developer → Access Tokens</li>
            </ul>
            
            <h3>2. Set Environment Variables</h3>
            <p>Create a <code>.env</code> file in your project root with:</p>
            <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;">
DATABRICKS_SERVER_HOSTNAME=your-workspace-url
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/your-warehouse-id
DATABRICKS_ACCESS_TOKEN=your-personal-access-token
DATABRICKS_CATALOG=main
DATABRICKS_SCHEMA=default
            </pre>
            
            <h3>3. Run Setup Script</h3>
            <p>Or run the setup script: <code>node setup-databricks.js</code></p>
            
            <h3>4. Restart Application</h3>
            <p>Restart the application to load your credentials.</p>
            
            <div style="text-align: center; margin-top: 2rem;">
              <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                      style="background: #667eea; color: white; border: none; 
                             padding: 0.75rem 2rem; border-radius: 6px; cursor: pointer;">
                Got it!
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML("beforeend", instructions);
    }

    getSampleData() {
      // Generate different sample data based on the selected table
      const tableName = this.S.analytics.activeTable || "test_table";
      const baseData = {
        agent_name: `Agent_${tableName.replace("test_table", "Test")}`,
        execution_timestamp: Date.now() / 1000,
        execution_date: new Date().toISOString().split("T")[0],
        execution_hour: new Date().toTimeString().split(" ")[0],
        execution_duration_ms: Math.random() * 10000 + 1000,
        execution_duration_seconds: Math.random() * 10 + 1,
        success: Math.random() > 0.1, // 90% success rate
        error_message: "",
        error_type: "",
        total_events: Math.floor(Math.random() * 10) + 1,
        total_tool_calls: Math.floor(Math.random() * 5) + 1,
        total_llm_calls: Math.floor(Math.random() * 3) + 1,
        avg_tool_call_duration_ms: Math.random() * 5000 + 500,
        avg_llm_call_duration_ms: Math.random() * 3000 + 1000,
        total_tokens_used: Math.floor(Math.random() * 5000) + 1000,
        prompt_tokens_used: Math.floor(Math.random() * 3000) + 500,
        completion_tokens_used: Math.floor(Math.random() * 2000) + 200,
        tokens_per_second: Math.random() * 500 + 100,
        cost_estimate_usd: Math.random() * 0.01 + 0.001,
        tools_used_count: Math.floor(Math.random() * 3) + 1,
        tools_used_list: "Text_Summary,Unit_Converter,Data_Processor",
        most_used_tool: ["Unit_Converter", "Text_Summary", "Data_Processor"][
          Math.floor(Math.random() * 3)
        ],
        most_used_tool_count: Math.floor(Math.random() * 3) + 1,
        tool_names: "Unit_Converter,Text_Summary,Data_Processor",
        llm_model_used: ["gpt-3.5-turbo-0125", "gpt-4", "claude-3-sonnet"][
          Math.floor(Math.random() * 3)
        ],
        llm_finish_reasons: "tool_calls,stop",
        input_size_chars: Math.floor(Math.random() * 2000) + 500,
        input_fields_count: Math.floor(Math.random() * 5) + 1,
        has_array_input: Math.random() > 0.5,
        agent_description: `This agent processes data from ${tableName} and performs various operations.`,
        available_tools_count: Math.floor(Math.random() * 5) + 2,
        available_tools_list:
          "Text_Summary,Unit_Converter,Data_Processor,JSON_Parser",
        utilities_enabled: "text_summary,unit_converter,data_processor",
        apis_configured: Math.floor(Math.random() * 3),
        tools_per_second: Math.random() * 2 + 0.1,
        events_per_second: Math.random() * 1 + 0.1,
        efficiency_score: Math.random() * 0.4 + 0.6, // 60-100% efficiency
        has_validation_errors: Math.random() > 0.8, // 20% chance of validation errors
        output_validation_success: Math.random() > 0.1, // 90% validation success
        llm_errors: Math.random() > 0.9 ? 1 : 0,
        tool_errors: Math.random() > 0.8 ? 1 : 0,
        execution_sequence: "Data_Processor->Unit_Converter->Text_Summary",
        tableName: tableName,
      };

      // Add some table-specific variations
      if (tableName.includes("2")) {
        baseData.agent_name = "DataProcessorAgent";
        baseData.tools_used_list = "Data_Processor,JSON_Parser,Text_Summary";
        baseData.most_used_tool = "Data_Processor";
      } else if (tableName.includes("3")) {
        baseData.agent_name = "AdvancedAnalyticsAgent";
        baseData.tools_used_list =
          "Data_Processor,Unit_Converter,Text_Summary,JSON_Parser";
        baseData.most_used_tool = "JSON_Parser";
        baseData.efficiency_score = Math.random() * 0.2 + 0.8; // Higher efficiency for table 3
      }

      return baseData;
    }

    buildSummaryHTML() {
      const data = this.S.analytics.agentData || this.getSampleData();
      const isMockData = !data.tableName || data.tableName === "test_table";

      return `
        <div class="page-header">
          <h2>Execution Summary</h2>
          <p class="page-description">
            Overview of the latest agent execution with key performance indicators
          </p>
        </div>

        <div class="overview-section">
          <div class="metric-card ${data.success ? "success" : "error"}">
            <div class="metric-icon">${data.success ? "✅" : "❌"}</div>
            <div class="metric-content">
              <h3>Execution Status</h3>
              <p class="metric-value">${data.success ? "Success" : "Failed"}</p>
              <p class="metric-description">Current execution state</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">⏱️</div>
            <div class="metric-content">
              <h3>Duration</h3>
              <p class="metric-value">${
                data.execution_duration_seconds?.toFixed(2) || "0"
              }s</p>
              <p class="metric-description">Total execution time</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">💰</div>
            <div class="metric-content">
              <h3>Cost</h3>
              <p class="metric-value">$${
                data.cost_estimate_usd?.toFixed(5) || "0.00000"
              }</p>
              <p class="metric-description">Estimated cost</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">🎯</div>
            <div class="metric-content">
              <h3>Efficiency</h3>
              <p class="metric-value">${Math.round(
                (data.efficiency_score || 0) * 100
              )}%</p>
              <p class="metric-description">Performance score</p>
            </div>
          </div>
        </div>

        <div class="summary-details">
          <div class="summary-card">
            <h3>Execution Details</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Agent Name:</span>
                <span class="detail-value">${
                  data.agent_name || "Unknown"
                }</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Execution Date:</span>
                <span class="detail-value">${
                  data.execution_date || "Unknown"
                }</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Total Events:</span>
                <span class="detail-value">${data.total_events || 0}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tools Used:</span>
                <span class="detail-value">${data.tools_used_count || 0}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">LLM Calls:</span>
                <span class="detail-value">${data.total_llm_calls || 0}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Total Tokens:</span>
                <span class="detail-value">${(
                  data.total_tokens_used || 0
                ).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div class="summary-card">
            <h3>Performance Insights</h3>
            <div class="insights-grid">
              <div class="insight-item">
                <div class="insight-icon">⚡</div>
                <div class="insight-content">
                  <h4>Speed</h4>
                  <p>${data.tokens_per_second?.toFixed(2) || 0} tokens/sec</p>
                </div>
              </div>
              <div class="insight-item">
                <div class="insight-icon">🔧</div>
                <div class="insight-content">
                  <h4>Tools</h4>
                  <p>${data.most_used_tool || "None"}</p>
                </div>
              </div>
              <div class="insight-item">
                <div class="insight-icon">🤖</div>
                <div class="insight-content">
                  <h4>Model</h4>
                  <p>${data.llm_model_used || "Unknown"}</p>
                </div>
              </div>
              <div class="insight-item">
                <div class="insight-icon">✅</div>
                <div class="insight-content">
                  <h4>Validation</h4>
                  <p>${data.output_validation_success ? "Passed" : "Failed"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    }

    buildMetricsHTML() {
      return `
        <div class="page-header">
          <h2>Performance Metrics</h2>
          <p class="page-description">
            Detailed visualizations and analytics for agent performance
          </p>
        </div>

        <div class="charts-section">
          <div class="chart-container">
            <h3>Performance Metrics</h3>
            <canvas id="analytics-performanceChart"></canvas>
          </div>
          <div class="chart-container">
            <h3>Token Usage</h3>
            <canvas id="analytics-tokenChart"></canvas>
          </div>
          <div class="chart-container">
            <h3>Execution Timeline</h3>
            <canvas id="analytics-timelineChart"></canvas>
          </div>
        </div>`;
    }

    buildTablesHTML() {
      const data = this.S.analytics.agentData || this.getSampleData();

      // Categorize the data fields for better organization
      const executionDetails = Object.entries(data)
        .filter(
          ([key]) =>
            !key.includes("raw_") &&
            !key.includes("_list") &&
            !key.includes("_ids")
        )
        .map(([key, value]) => {
          let displayValue = value;
          let description = "Agent execution data field";

          // Format values based on type and content
          if (typeof value === "boolean") {
            displayValue = value ? "Yes" : "No";
            description = "Boolean flag";
          } else if (typeof value === "number") {
            if (key.includes("timestamp") || key.includes("time")) {
              displayValue = new Date(value * 1000).toLocaleString();
              description = "Timestamp";
            } else if (key.includes("cost") || key.includes("price")) {
              displayValue = `$${value.toFixed(5)}`;
              description = "Monetary value";
            } else if (key.includes("duration") || key.includes("time")) {
              displayValue = `${value.toFixed(2)}s`;
              description = "Time duration";
            } else if (key.includes("score") || key.includes("rate")) {
              displayValue = `${Math.round(value * 100)}%`;
              description = "Percentage score";
            } else {
              displayValue = value.toLocaleString();
              description = "Numeric value";
            }
          } else if (typeof value === "string" && value.length > 100) {
            displayValue = value.substring(0, 100) + "...";
            description = "Long text (truncated)";
          } else if (typeof value === "string" && value.includes(",")) {
            displayValue = value.split(",").length + " items";
            description = "Comma-separated list";
          }

          return {
            field: key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()),
            value: displayValue,
            description: description,
            category: this.categorizeField(key),
          };
        });

      // Group by category
      const categorizedData = executionDetails.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {});

      const categorySections = Object.entries(categorizedData)
        .map(
          ([category, items]) => `
        <div class="table-container">
          <h3>${category}</h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item) => `
                  <tr>
                    <td><strong>${item.field}</strong></td>
                    <td>${item.value}</td>
                    <td>${item.description}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `
        )
        .join("");

      return `
        <div class="page-header">
          <h2>Data Tables - ${data.tableName || "Current Table"}</h2>
          <p class="page-description">
            Comprehensive data fields and detailed information from ${
              data.tableName || "the selected table"
            }
          </p>
        </div>

        <div class="tables-section">
          ${categorySections}
        </div>`;
    }

    categorizeField(fieldName) {
      if (fieldName.includes("agent") || fieldName.includes("name"))
        return "Agent Information";
      if (
        fieldName.includes("execution") ||
        fieldName.includes("duration") ||
        fieldName.includes("timestamp")
      )
        return "Execution Details";
      if (fieldName.includes("tool") || fieldName.includes("llm"))
        return "Tool & LLM Usage";
      if (
        fieldName.includes("token") ||
        fieldName.includes("cost") ||
        fieldName.includes("price")
      )
        return "Cost & Token Usage";
      if (
        fieldName.includes("success") ||
        fieldName.includes("error") ||
        fieldName.includes("validation")
      )
        return "Status & Validation";
      if (
        fieldName.includes("efficiency") ||
        fieldName.includes("performance") ||
        fieldName.includes("score")
      )
        return "Performance Metrics";
      return "Other Data";
    }

    createCharts() {
      const data = this.S.analytics.agentData || this.getSampleData();

      // Destroy existing charts
      Object.values(this.S.analytics.charts).forEach((chart) => {
        if (chart && chart.destroy) chart.destroy();
      });
      this.S.analytics.charts = {};

      // Only create charts if Chart.js is available and we have canvas elements
      if (typeof Chart === "undefined") {
        console.warn("Chart.js not available, skipping chart creation");
        return;
      }

      try {
        // Performance Chart - Enhanced with more metrics
        const perfCanvas = document.getElementById(
          "analytics-performanceChart"
        );
        if (perfCanvas) {
          this.S.analytics.charts.performance = new Chart(perfCanvas, {
            type: "bar",
            data: {
              labels: [
                "Duration (s)",
                "Tools Used",
                "LLM Calls",
                "Events",
                "Tokens/sec",
                "Efficiency %",
              ],
              datasets: [
                {
                  label: "Performance Metrics",
                  data: [
                    (data.execution_duration_seconds || 0).toFixed(2),
                    data.tools_used_count || 0,
                    data.total_llm_calls || 0,
                    data.total_events || 0,
                    (data.tokens_per_second || 0).toFixed(1),
                    Math.round((data.efficiency_score || 0) * 100),
                  ],
                  backgroundColor: [
                    "rgba(102, 126, 234, 0.8)",
                    "rgba(118, 75, 162, 0.8)",
                    "rgba(16, 185, 129, 0.8)",
                    "rgba(245, 158, 11, 0.8)",
                    "rgba(239, 68, 68, 0.8)",
                    "rgba(139, 69, 19, 0.8)",
                  ],
                  borderColor: [
                    "rgba(102, 126, 234, 1)",
                    "rgba(118, 75, 162, 1)",
                    "rgba(16, 185, 129, 1)",
                    "rgba(245, 158, 11, 1)",
                    "rgba(239, 68, 68, 1)",
                    "rgba(139, 69, 19, 1)",
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
                title: {
                  display: true,
                  text: `Performance Metrics - ${
                    data.tableName || "Current Table"
                  }`,
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

        // Token Usage Chart - Enhanced with more details
        const tokenCanvas = document.getElementById("analytics-tokenChart");
        if (tokenCanvas) {
          const promptTokens = data.prompt_tokens_used || 0;
          const completionTokens = data.completion_tokens_used || 0;
          const totalTokens = promptTokens + completionTokens;

          this.S.analytics.charts.token = new Chart(tokenCanvas, {
            type: "doughnut",
            data: {
              labels: [
                `Prompt Tokens (${promptTokens.toLocaleString()})`,
                `Completion Tokens (${completionTokens.toLocaleString()})`,
              ],
              datasets: [
                {
                  data: [promptTokens, completionTokens],
                  backgroundColor: [
                    "rgba(102, 126, 234, 0.8)",
                    "rgba(118, 75, 162, 0.8)",
                  ],
                  borderColor: [
                    "rgba(102, 126, 234, 1)",
                    "rgba(118, 75, 162, 1)",
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
                  position: "bottom",
                  labels: {
                    padding: 20,
                    usePointStyle: true,
                  },
                },
                title: {
                  display: true,
                  text: `Token Usage - Total: ${totalTokens.toLocaleString()} tokens`,
                },
              },
            },
          });
        }

        // Timeline Chart - Enhanced with more realistic timeline
        const timelineCanvas = document.getElementById(
          "analytics-timelineChart"
        );
        if (timelineCanvas) {
          const duration = data.execution_duration_seconds || 6;
          const toolCalls = data.total_tool_calls || 0;
          const llmCalls = data.total_llm_calls || 0;

          // Create a more realistic timeline
          const timelineData = [];
          const timelineLabels = [];
          let currentTime = 0;

          timelineLabels.push("Start");
          timelineData.push(0);

          // Add tool call points
          for (let i = 0; i < toolCalls; i++) {
            currentTime += duration / (toolCalls + llmCalls + 1);
            timelineLabels.push(`Tool Call ${i + 1}`);
            timelineData.push(currentTime);
          }

          // Add LLM call points
          for (let i = 0; i < llmCalls; i++) {
            currentTime += duration / (toolCalls + llmCalls + 1);
            timelineLabels.push(`LLM Call ${i + 1}`);
            timelineData.push(currentTime);
          }

          timelineLabels.push("End");
          timelineData.push(duration);

          this.S.analytics.charts.timeline = new Chart(timelineCanvas, {
            type: "line",
            data: {
              labels: timelineLabels,
              datasets: [
                {
                  label: "Execution Timeline (seconds)",
                  data: timelineData,
                  borderColor: "#667eea",
                  backgroundColor: "rgba(102, 126, 234, 0.1)",
                  borderWidth: 3,
                  fill: true,
                  tension: 0.4,
                  pointBackgroundColor: "#667eea",
                  pointBorderColor: "#ffffff",
                  pointBorderWidth: 2,
                  pointRadius: 6,
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
                title: {
                  display: true,
                  text: `Execution Timeline - ${data.agent_name || "Agent"}`,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: "Time (seconds)",
                  },
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
      } catch (error) {
        console.error("Error creating charts:", error);
      }
    }
  }

  // Create global instance
  global.analyticsTabInstance = new AnalyticsTab();

  // Export to App namespace for consistency
  global.App = global.App || {};
  global.App.AnalyticsTab = AnalyticsTab;
})(window);
