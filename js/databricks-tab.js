// Databricks Tab Component
// This file contains all the functionality and styling for the Databricks tab

(function (global) {
  class DatabricksTab {
    constructor() {
      // Use shared state instead of local variables
      const S = window.App.state;
      this.S = S;

      // Keep local state for UI-specific data
      this.agentData = null;
      this.isLoading = false;
      this.currentError = null;
      this.availableTables = [];
      this.currentTable = null;
      this.charts = {}; // Store chart instances

      this.init();
    }

    init() {
      this.injectStyles();
      this.render();
      this.setupEventListeners();
      this.loadData();
    }

    injectStyles() {
      // Inject CSS styles for the component
      const styleId = "databricks-tab-styles";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          .databricks-view {
            padding: 0 0 0 20px;
            text-align: left;
            width: 100% !important;
            max-width: none !important;
            min-width: 100% !important;
            flex: 1 1 100% !important;
            align-self: stretch !important;
          }

          .databricks-header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            position: relative;
            width: 100%;
            max-width: none;
          }

          .databricks-main-title {
            color: #000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
          }

          .databricks-header-section::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: -40px;
            right: -40px;
            height: 3px;
            background-color: rgba(251, 144, 40, 0.6);
          }

          .databricks-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-right: 20px;
            margin-top: 16px;
          }

          .table-selector {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .table-selector label {
            font-size: 14px;
            font-weight: 500;
            color: #333;
          }

          .table-dropdown {
            padding: 6px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            font-size: 14px;
            min-width: 150px;
          }

          .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-primary {
            background: #007bff;
            color: white;
          }

          .btn-primary:hover {
            background: #0056b3;
          }

          .btn-secondary {
            background: #6c757d;
            color: white;
          }

          .btn-secondary:hover {
            background: #545b62;
          }

          .btn-icon {
            font-size: 12px;
          }

          .databricks-content {
            margin-top: 20px;
          }

          /* Navigation Tabs */
          .nav-tabs {
            display: flex;
            border-bottom: 1px solid #e0e0e0;
            margin-bottom: 20px;
          }

          .nav-tab {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #666;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
          }

          .nav-tab:hover {
            color: #333;
            background: #f8f9fa;
          }

          .nav-tab.active {
            color: #007bff;
            border-bottom-color: #007bff;
            background: #f8f9fa;
          }

          .tab-icon {
            font-size: 16px;
          }

          .tab-text {
            font-size: 14px;
          }

          /* Page Content */
          .page {
            display: none;
          }

          .page.active {
            display: block;
          }

          .page-header {
            margin-bottom: 24px;
          }

          .page-header h2 {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin: 0 0 8px 0;
          }

          .page-description {
            color: #666;
            font-size: 14px;
            margin: 0;
          }

          /* Overview Cards */
          .overview-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
          }

          .metric-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .metric-card.success {
            border-left: 4px solid #28a745;
          }

          .metric-icon {
            font-size: 24px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
            border-radius: 50%;
          }

          .metric-content h3 {
            font-size: 14px;
            font-weight: 500;
            color: #666;
            margin: 0 0 4px 0;
          }

          .metric-value {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin: 0 0 4px 0;
          }

          .metric-description {
            font-size: 12px;
            color: #999;
            margin: 0;
          }

          /* Charts Section */
          .charts-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 24px;
            margin-bottom: 32px;
          }

          .chart-container {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .chart-container h3 {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin: 0 0 16px 0;
          }

          .chart-container canvas {
            max-width: 100%;
            height: 300px;
          }

          /* Tables Section */
          .tables-section {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .table-container {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .table-container h3 {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin: 0 0 16px 0;
          }

          .table-wrapper {
            overflow-x: auto;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }

          .data-table th,
          .data-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
          }

          .data-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #333;
          }

          .data-table tr:hover {
            background: #f8f9fa;
          }

          /* Summary Details */
          .summary-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 24px;
            margin-top: 24px;
          }

          .summary-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .summary-card h3 {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin: 0 0 16px 0;
          }

          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .detail-label {
            font-size: 12px;
            color: #666;
            font-weight: 500;
          }

          .detail-value {
            font-size: 14px;
            color: #333;
            font-weight: 600;
          }

          .insights-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
          }

          .insight-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
          }

          .insight-icon {
            font-size: 20px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            border-radius: 50%;
          }

          .insight-content h4 {
            font-size: 12px;
            font-weight: 600;
            color: #666;
            margin: 0 0 4px 0;
          }

          .insight-content p {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin: 0;
          }

          /* Loading and Error States */
          .loading-state {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: #666;
          }

          .error-state {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: #dc3545;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            margin: 20px 0;
          }

          /* Responsive Design */
          @media (max-width: 768px) {
            .databricks-controls {
              flex-direction: column;
              align-items: stretch;
              gap: 12px;
            }

            .overview-section {
              grid-template-columns: 1fr;
            }

            .charts-section {
              grid-template-columns: 1fr;
            }

            .summary-details {
              grid-template-columns: 1fr;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }

    render() {
      return `
        <div class="databricks-view">
          <div class="databricks-header-section">
            <h1 class="databricks-main-title">Agent Analytics Dashboard</h1>
            <div class="databricks-controls">
              <div class="table-selector">
                <label for="table-select">Select Table:</label>
                <select id="table-select" class="table-dropdown">
                  <option value="">Loading tables...</option>
                </select>
              </div>
              <button id="refresh-data" class="btn btn-primary">
                <i class="fas fa-sync-alt btn-icon"></i>
                Refresh Data
              </button>
              <button id="export-data" class="btn btn-secondary">
                <i class="fas fa-download btn-icon"></i>
                Export Report
              </button>
              <button id="open-databricks" class="btn btn-secondary">
                <i class="fas fa-external-link-alt btn-icon"></i>
                Open Databricks
              </button>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <nav class="nav-tabs">
            <button class="nav-tab active" data-page="summary">
              <span class="tab-icon">📊</span>
              <span class="tab-text">Summary</span>
            </button>
            <button class="nav-tab" data-page="metrics">
              <span class="tab-icon">📈</span>
              <span class="tab-text">Metrics</span>
            </button>
            <button class="nav-tab" data-page="tables">
              <span class="tab-icon">📋</span>
              <span class="tab-text">Data Tables</span>
            </button>
          </nav>

          <main class="databricks-content">
            <!-- Summary Page -->
            <div id="summary-page" class="page active">
              <div class="page-header">
                <h2>Execution Summary</h2>
                <p class="page-description">
                  Overview of the latest agent execution with key performance indicators
                </p>
              </div>

              <!-- Overview Cards -->
              <div class="overview-section">
                <div class="metric-card success">
                  <div class="metric-icon">✅</div>
                  <div class="metric-content">
                    <h3>Execution Status</h3>
                    <p class="metric-value" id="execution-status">Success</p>
                    <p class="metric-description">Current execution state</p>
                  </div>
                </div>
                <div class="metric-card">
                  <div class="metric-icon">⏱️</div>
                  <div class="metric-content">
                    <h3>Duration</h3>
                    <p class="metric-value" id="execution-duration">6.82s</p>
                    <p class="metric-description">Total execution time</p>
                  </div>
                </div>
                <div class="metric-card">
                  <div class="metric-icon">💰</div>
                  <div class="metric-content">
                    <h3>Cost</h3>
                    <p class="metric-value" id="execution-cost">$0.00348</p>
                    <p class="metric-description">Estimated cost</p>
                  </div>
                </div>
                <div class="metric-card">
                  <div class="metric-icon">🎯</div>
                  <div class="metric-content">
                    <h3>Efficiency</h3>
                    <p class="metric-value" id="efficiency-score">59%</p>
                    <p class="metric-description">Performance score</p>
                  </div>
                </div>
              </div>

              <!-- Additional Summary Cards -->
              <div class="summary-details">
                <div class="summary-card">
                  <h3>Execution Details</h3>
                  <div class="detail-grid">
                    <div class="detail-item">
                      <span class="detail-label">Agent Name:</span>
                      <span class="detail-value" id="agent-name">ConvertMilesStorySummary</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Execution Date:</span>
                      <span class="detail-value" id="execution-date">2025-09-13</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Total Events:</span>
                      <span class="detail-value" id="total-events">4</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Tools Used:</span>
                      <span class="detail-value" id="tools-used">2</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">LLM Calls:</span>
                      <span class="detail-value" id="llm-calls">2</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Total Tokens:</span>
                      <span class="detail-value" id="total-tokens">2,320</span>
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
                        <p id="tokens-per-second">339.98 tokens/sec</p>
                      </div>
                    </div>
                    <div class="insight-item">
                      <div class="insight-icon">🔧</div>
                      <div class="insight-content">
                        <h4>Tools</h4>
                        <p id="most-used-tool">Unit_Converter</p>
                      </div>
                    </div>
                    <div class="insight-item">
                      <div class="insight-icon">🤖</div>
                      <div class="insight-content">
                        <h4>Model</h4>
                        <p id="llm-model">gpt-3.5-turbo-0125</p>
                      </div>
                    </div>
                    <div class="insight-item">
                      <div class="insight-icon">✅</div>
                      <div class="insight-content">
                        <h4>Validation</h4>
                        <p id="validation-status">Passed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Metrics Page -->
            <div id="metrics-page" class="page">
              <div class="page-header">
                <h2>Performance Metrics</h2>
                <p class="page-description">
                  Detailed visualizations and analytics for agent performance
                </p>
              </div>

              <!-- Charts Section -->
              <div class="charts-section">
                <div class="chart-container">
                  <h3>Performance Metrics</h3>
                  <canvas id="performanceChart"></canvas>
                </div>
                <div class="chart-container">
                  <h3>Token Usage</h3>
                  <canvas id="tokenChart"></canvas>
                </div>
                <div class="chart-container">
                  <h3>Execution Timeline</h3>
                  <canvas id="timelineChart"></canvas>
                </div>
              </div>
            </div>

            <!-- Data Tables Page -->
            <div id="tables-page" class="page">
              <div class="page-header">
                <h2>Data Tables</h2>
                <p class="page-description">
                  Comprehensive data fields and detailed information
                </p>
              </div>

              <!-- Data Tables Section -->
              <div class="tables-section">
                <div class="table-container">
                  <h3>Data Fields</h3>
                  <div class="table-wrapper">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Value</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody id="execution-details">
                        <!-- Populated by JavaScript -->
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="table-container">
                  <h3>Tool-Related Data</h3>
                  <div class="table-wrapper">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Count</th>
                          <th>Duration (ms)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody id="tool-performance">
                        <!-- Populated by JavaScript -->
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="table-container">
                  <h3>Model-Related Data</h3>
                  <div class="table-wrapper">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Field #</th>
                          <th>Model</th>
                          <th>Reason</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody id="llm-details">
                        <!-- Populated by JavaScript -->
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      `;
    }

    setupEventListeners() {
      // Page navigation
      const navTabs = document.querySelectorAll(".nav-tab");
      navTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          // Remove active class from all tabs
          navTabs.forEach((t) => t.classList.remove("active"));
          // Add active class to clicked tab
          tab.classList.add("active");

          // Hide all pages
          const pages = document.querySelectorAll(".page");
          pages.forEach((page) => page.classList.remove("active"));

          // Show selected page
          const pageId = tab.getAttribute("data-page");
          const targetPage = document.getElementById(`${pageId}-page`);
          if (targetPage) {
            targetPage.classList.add("active");
          }
        });
      });

      // Table selector
      const tableSelect = document.getElementById("table-select");
      if (tableSelect) {
        tableSelect.addEventListener("change", (e) => {
          this.currentTable = e.target.value;
          this.loadData();
        });
      }

      // Refresh data button
      const refreshBtn = document.getElementById("refresh-data");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          this.loadData();
        });
      }

      // Export data button
      const exportBtn = document.getElementById("export-data");
      if (exportBtn) {
        exportBtn.addEventListener("click", () => {
          this.exportData();
        });
      }

      // Open Databricks button
      const openDatabricksBtn = document.getElementById("open-databricks");
      if (openDatabricksBtn) {
        openDatabricksBtn.addEventListener("click", () => {
          this.openDatabricks();
        });
      }
    }

    async loadData() {
      try {
        this.isLoading = true;
        this.updateLoadingState();

        // Load available tables first
        await this.loadAvailableTables();

        // Load data based on selected table
        if (this.currentTable) {
          await this.loadTableData(this.currentTable);
        } else {
          // Load latest execution data
          await this.loadLatestExecution();
        }
      } catch (error) {
        console.error("Error loading data:", error);
        this.showError(error.message);
      } finally {
        this.isLoading = false;
      }
    }

    async loadAvailableTables() {
      try {
        const { ipcRenderer } = require("electron");
        const result = await ipcRenderer.invoke("get-available-tables");
        if (result.success) {
          this.availableTables = result.data.map((table) => ({
            name: table.name,
            displayName: table.name
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()),
          }));
        } else {
          console.log("Error loading tables:", result.error);
          // Fallback to mock data
          this.availableTables = [
            { name: "agent_executions", displayName: "Agent Executions" },
            { name: "tool_usage", displayName: "Tool Usage" },
            { name: "llm_calls", displayName: "LLM Calls" },
          ];
        }
        this.populateTableSelector();
      } catch (error) {
        console.error("Error loading available tables:", error);
        this.availableTables = [];
        this.populateTableSelector();
      }
    }

    populateTableSelector() {
      const select = document.getElementById("table-select");
      if (!select) return;

      if (this.availableTables.length === 0) {
        select.innerHTML = '<option value="">No tables found</option>';
        return;
      }

      select.innerHTML = '<option value="">Select a table...</option>';
      this.availableTables.forEach((table) => {
        const option = document.createElement("option");
        option.value = table.name;
        option.textContent = table.displayName;
        select.appendChild(option);
      });
    }

    async loadTableData(tableName) {
      try {
        const { ipcRenderer } = require("electron");
        const result = await ipcRenderer.invoke("query-table", tableName, 100);
        if (result.success) {
          this.updateDataWithRealData(result.data);
        } else {
          console.error("Error loading table data:", result.error);
          this.showError(result.error);
        }
      } catch (error) {
        console.error("Error loading table data:", error);
        this.showError(error.message);
      }
    }

    async loadLatestExecution() {
      try {
        const { ipcRenderer } = require("electron");
        const result = await ipcRenderer.invoke("get-latest-execution");
        if (result.success && result.data) {
          this.updateDataWithRealData([result.data]);
        } else {
          console.log("No latest execution data available, using mock data");
          this.updateDataWithMock();
        }
      } catch (error) {
        console.error("Error loading latest execution:", error);
        this.updateDataWithMock();
      }
    }

    updateDataWithRealData(data) {
      if (!data || data.length === 0) {
        this.updateDataWithMock();
        return;
      }

      const latestExecution = data[0];

      // Update summary cards with real data
      this.updateElement(
        "execution-status",
        latestExecution.success ? "Success" : "Failed"
      );
      this.updateElement(
        "execution-duration",
        `${latestExecution.execution_duration_seconds || 0}s`
      );
      this.updateElement(
        "execution-cost",
        `$${latestExecution.cost_estimate_usd || 0}`
      );
      this.updateElement(
        "efficiency-score",
        `${Math.round(latestExecution.efficiency_score || 0)}%`
      );
      this.updateElement("agent-name", latestExecution.agent_name || "Unknown");
      this.updateElement(
        "execution-date",
        latestExecution.execution_date || "Unknown"
      );
      this.updateElement("total-events", latestExecution.total_events || 0);
      this.updateElement("tools-used", latestExecution.total_tool_calls || 0);
      this.updateElement("llm-calls", latestExecution.total_llm_calls || 0);
      this.updateElement(
        "total-tokens",
        (latestExecution.total_tokens_used || 0).toLocaleString()
      );
      this.updateElement(
        "tokens-per-second",
        `${latestExecution.tokens_per_second || 0} tokens/sec`
      );
      this.updateElement(
        "most-used-tool",
        latestExecution.most_used_tool || "None"
      );
      this.updateElement(
        "llm-model",
        latestExecution.llm_model_used || "Unknown"
      );
      this.updateElement(
        "validation-status",
        latestExecution.output_validation_success ? "Passed" : "Failed"
      );

      // Update tables with real data
      this.updateExecutionDetailsTableWithRealData(latestExecution);
      this.updateToolPerformanceTableWithRealData(latestExecution);
      this.updateLLMDetailsTableWithRealData(latestExecution);

      // Initialize charts
      this.initializeCharts();
    }

    updateDataWithMock() {
      // Update summary cards with mock data
      this.updateElement("execution-status", "Success");
      this.updateElement("execution-duration", "6.82s");
      this.updateElement("execution-cost", "$0.00348");
      this.updateElement("efficiency-score", "59%");
      this.updateElement("agent-name", "ConvertMilesStorySummary");
      this.updateElement("execution-date", "2025-09-13");
      this.updateElement("total-events", "4");
      this.updateElement("tools-used", "2");
      this.updateElement("llm-calls", "2");
      this.updateElement("total-tokens", "2,320");
      this.updateElement("tokens-per-second", "339.98 tokens/sec");
      this.updateElement("most-used-tool", "Unit_Converter");
      this.updateElement("llm-model", "gpt-3.5-turbo-0125");
      this.updateElement("validation-status", "Passed");

      // Update tables with mock data
      this.updateExecutionDetailsTable();
      this.updateToolPerformanceTable();
      this.updateLLMDetailsTable();

      // Initialize charts
      this.initializeCharts();
    }

    updateElement(id, value) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    }

    updateExecutionDetailsTable() {
      const tbody = document.getElementById("execution-details");
      if (!tbody) return;

      const mockData = [
        {
          field: "Agent ID",
          value: "agent_001",
          description: "Unique agent identifier",
        },
        {
          field: "Execution ID",
          value: "exec_12345",
          description: "Unique execution identifier",
        },
        {
          field: "Start Time",
          value: "2025-09-13 10:30:00",
          description: "Execution start timestamp",
        },
        {
          field: "End Time",
          value: "2025-09-13 10:30:06",
          description: "Execution end timestamp",
        },
        {
          field: "Status",
          value: "Completed",
          description: "Execution status",
        },
        {
          field: "Total Cost",
          value: "$0.00348",
          description: "Total execution cost",
        },
      ];

      tbody.innerHTML = mockData
        .map(
          (row) => `
        <tr>
          <td>${row.field}</td>
          <td>${row.value}</td>
          <td>${row.description}</td>
        </tr>
      `
        )
        .join("");
    }

    updateToolPerformanceTable() {
      const tbody = document.getElementById("tool-performance");
      if (!tbody) return;

      const mockData = [
        { field: "Unit_Converter", count: 3, duration: 150, status: "Success" },
        { field: "Text_Summary", count: 1, duration: 200, status: "Success" },
        { field: "JSON_Parser", count: 2, duration: 100, status: "Success" },
      ];

      tbody.innerHTML = mockData
        .map(
          (row) => `
        <tr>
          <td>${row.field}</td>
          <td>${row.count}</td>
          <td>${row.duration}</td>
          <td>${row.status}</td>
        </tr>
      `
        )
        .join("");
    }

    updateLLMDetailsTable() {
      const tbody = document.getElementById("llm-details");
      if (!tbody) return;

      const mockData = [
        {
          field: 1,
          model: "gpt-3.5-turbo-0125",
          reason: "Text processing",
          timestamp: "2025-09-13 10:30:01",
        },
        {
          field: 2,
          model: "gpt-3.5-turbo-0125",
          reason: "Data validation",
          timestamp: "2025-09-13 10:30:03",
        },
      ];

      tbody.innerHTML = mockData
        .map(
          (row) => `
        <tr>
          <td>${row.field}</td>
          <td>${row.model}</td>
          <td>${row.reason}</td>
          <td>${row.timestamp}</td>
        </tr>
      `
        )
        .join("");
    }

    updateExecutionDetailsTableWithRealData(execution) {
      const tbody = document.getElementById("execution-details");
      if (!tbody) return;

      const realData = [
        {
          field: "Agent ID",
          value: execution.agent_name || "Unknown",
          description: "Agent identifier",
        },
        {
          field: "Execution ID",
          value: execution.execution_timestamp || "Unknown",
          description: "Execution timestamp",
        },
        {
          field: "Start Time",
          value: execution.execution_timestamp || "Unknown",
          description: "Execution start timestamp",
        },
        {
          field: "End Time",
          value: execution.execution_timestamp || "Unknown",
          description: "Execution end timestamp",
        },
        {
          field: "Status",
          value: execution.success ? "Completed" : "Failed",
          description: "Execution status",
        },
        {
          field: "Total Cost",
          value: `$${execution.cost_estimate_usd || 0}`,
          description: "Total execution cost",
        },
      ];

      tbody.innerHTML = realData
        .map(
          (row) => `
        <tr>
          <td>${row.field}</td>
          <td>${row.value}</td>
          <td>${row.description}</td>
        </tr>
      `
        )
        .join("");
    }

    updateToolPerformanceTableWithRealData(execution) {
      const tbody = document.getElementById("tool-performance");
      if (!tbody) return;

      // Parse tools used from the execution data
      const toolsUsed = execution.tools_used_list
        ? execution.tools_used_list.split(",")
        : [];
      const toolCounts = execution.tool_names
        ? execution.tool_names.split(",")
        : [];

      const realData = toolsUsed.map((tool, index) => ({
        field: tool.trim(),
        count: execution.total_tool_calls || 0,
        duration: Math.round(execution.avg_tool_call_duration_ms || 0),
        status: "Success",
      }));

      if (realData.length === 0) {
        realData.push({
          field: "No tools used",
          count: 0,
          duration: 0,
          status: "N/A",
        });
      }

      tbody.innerHTML = realData
        .map(
          (row) => `
        <tr>
          <td>${row.field}</td>
          <td>${row.count}</td>
          <td>${row.duration}</td>
          <td>${row.status}</td>
        </tr>
      `
        )
        .join("");
    }

    updateLLMDetailsTableWithRealData(execution) {
      const tbody = document.getElementById("llm-details");
      if (!tbody) return;

      const realData = [
        {
          field: 1,
          model: execution.llm_model_used || "Unknown",
          reason: "Primary LLM call",
          timestamp: execution.execution_timestamp || "Unknown",
        },
      ];

      // Add additional LLM calls if available
      if (execution.total_llm_calls > 1) {
        for (let i = 2; i <= execution.total_llm_calls; i++) {
          realData.push({
            field: i,
            model: execution.llm_model_used || "Unknown",
            reason: `LLM call ${i}`,
            timestamp: execution.execution_timestamp || "Unknown",
          });
        }
      }

      tbody.innerHTML = realData
        .map(
          (row) => `
        <tr>
          <td>${row.field}</td>
          <td>${row.model}</td>
          <td>${row.reason}</td>
          <td>${row.timestamp}</td>
        </tr>
      `
        )
        .join("");
    }

    initializeCharts() {
      // Initialize Chart.js charts if available
      if (typeof Chart !== "undefined") {
        this.createPerformanceChart();
        this.createTokenChart();
        this.createTimelineChart();
      }
    }

    createPerformanceChart() {
      const ctx = document.getElementById("performanceChart");
      if (!ctx) return;

      if (this.charts.performance) {
        this.charts.performance.destroy();
      }

      this.charts.performance = new Chart(ctx, {
        type: "line",
        data: {
          labels: ["Execution 1", "Execution 2", "Execution 3", "Execution 4"],
          datasets: [
            {
              label: "Duration (s)",
              data: [6.2, 5.8, 7.1, 6.82],
              borderColor: "#007bff",
              backgroundColor: "rgba(0, 123, 255, 0.1)",
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }

    createTokenChart() {
      const ctx = document.getElementById("tokenChart");
      if (!ctx) return;

      if (this.charts.token) {
        this.charts.token.destroy();
      }

      this.charts.token = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Input Tokens", "Output Tokens"],
          datasets: [
            {
              data: [1800, 520],
              backgroundColor: ["#007bff", "#28a745"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }

    createTimelineChart() {
      const ctx = document.getElementById("timelineChart");
      if (!ctx) return;

      if (this.charts.timeline) {
        this.charts.timeline.destroy();
      }

      this.charts.timeline = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Tool 1", "Tool 2", "LLM Call 1", "LLM Call 2"],
          datasets: [
            {
              label: "Duration (ms)",
              data: [150, 200, 300, 250],
              backgroundColor: "#17a2b8",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }

    updateLoadingState() {
      const content = document.querySelector(".databricks-content");
      if (content) {
        content.innerHTML = '<div class="loading-state">Loading data...</div>';
      }
    }

    showError(message) {
      const content = document.querySelector(".databricks-content");
      if (content) {
        content.innerHTML = `<div class="error-state">Error: ${message}</div>`;
      }
    }

    exportData() {
      // Implement data export functionality
      console.log("Exporting data...");
      // This would normally trigger a download or save operation
    }

    openDatabricks() {
      // Implement opening Databricks workspace
      console.log("Opening Databricks workspace...");
      // This would normally open the Databricks workspace in a browser
    }

    destroyCharts() {
      Object.values(this.charts).forEach((chart) => {
        if (chart && typeof chart.destroy === "function") {
          chart.destroy();
        }
      });
      this.charts = {};
    }
  }

  // Export to global scope
  global.DatabricksTab = DatabricksTab;
})(window);
