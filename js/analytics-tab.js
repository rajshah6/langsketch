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
          openDatabricks: null
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
            const result = await global.ipcRenderer.invoke("query-table", table, 100);
            if (result.success && result.data.length > 0) {
              const data = result.data[0];
              data.allRows = result.data;
              data.tableName = table;
              return data;
            }
          } else if (global.ipcRenderer) {
            const result = await global.ipcRenderer.invoke("get-latest-execution");
            if (result.success && result.data) {
              return result.data;
            }
          }

          // Fallback to sample data if no IPC available
          return this.getSampleData();
        } catch (error) {
          console.error('Error fetching analytics data:', error);
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
          const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

          const exportFileDefaultName = `agent-analytics-${new Date().toISOString().split('T')[0]}.json`;

          const linkElement = document.createElement('a');
          linkElement.setAttribute('href', dataUri);
          linkElement.setAttribute('download', exportFileDefaultName);
          linkElement.click();
        }
      };

      // Set up Databricks link functionality
      S.analytics.openDatabricks = () => {
        if (global.require) {
          const { shell } = global.require('electron');
          shell.openExternal(
            "https://dbc-2f5ab88f-ea86.cloud.databricks.com/explore/data/workspace/default?o=3699346728778382"
          );
        } else {
          window.open("https://dbc-2f5ab88f-ea86.cloud.databricks.com/explore/data/workspace/default?o=3699346728778382", "_blank");
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
      this.rootEl.querySelectorAll('.analytics-tab').forEach(btn => {
        btn.addEventListener('click', () => this.switchTo(btn.dataset.tab));
      });

      // Actions
      this.rootEl.querySelector('#analytics-refresh').addEventListener('click', () => this.refreshCurrent());
      this.rootEl.querySelector('#analytics-export').addEventListener('click', () => this.S.analytics.exportReport());
      this.rootEl.querySelector('#analytics-open-db').addEventListener('click', () => this.S.analytics.openDatabricks());

      // Table selector
      this.rootEl.querySelector('#analytics-table-select').addEventListener('change', (e) => this.onTableChange(e));
    }

    async show() {
      const mainContent = document.querySelector('.main-content');
      if (!mainContent) return;

      // Render analytics content
      mainContent.innerHTML = `<div id="analyticsTabContainer">${this.render()}</div>`;

      this.rootEl = document.getElementById('analyticsTabContainer');
      this.setupEventListeners();

      // Load initial data
      await this.loadAvailableTables();
      await this.refreshCurrent();
    }

    switchTo(name) {
      if (!this.rootEl) return;

      this.rootEl.querySelectorAll('.analytics-tab').forEach(b => b.classList.remove('active'));
      this.rootEl.querySelector(`.analytics-tab[data-tab="${name}"]`).classList.add('active');

      this.rootEl.querySelectorAll('.analytics-pane').forEach(p => p.classList.remove('active'));
      this.rootEl.querySelector(`#analytics-${name}`).classList.add('active');

      this.renderPane(name);
    }

    async renderPane(name) {
      if (!this.rootEl) return;

      const pane = this.rootEl.querySelector(`#analytics-${name}`);
      if (!pane) return;

      switch(name) {
        case 'summary':
          pane.innerHTML = this.buildSummaryHTML();
          break;
        case 'metrics':
          pane.innerHTML = this.buildMetricsHTML();
          // Create charts after a short delay to ensure DOM is ready
          setTimeout(() => this.createCharts(), 100);
          break;
        case 'tables':
          pane.innerHTML = this.buildTablesHTML();
          break;
      }
    }

    async loadAvailableTables() {
      try {
        if (global.ipcRenderer) {
          const result = await global.ipcRenderer.invoke("get-available-tables");
          if (result.success) {
            this.S.analytics.tables = result.data;
            this.populateTableSelector();
          }
        } else {
          // Fallback - mock tables
          this.S.analytics.tables = [
            { name: "agent_executions_2024_09", label: "September 2024" },
            { name: "agent_executions_2024_08", label: "August 2024" }
          ];
          this.populateTableSelector();
        }
      } catch (error) {
        console.error("Error loading tables:", error);
      }
    }

    populateTableSelector() {
      if (!this.rootEl) return;

      const select = this.rootEl.querySelector('#analytics-table-select');
      if (!select) return;

      select.innerHTML = '';

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
        const activeTab = this.rootEl?.querySelector('.analytics-tab.active')?.dataset.tab || 'summary';
        const data = await this.S.analytics.fetch(activeTab, this.S.analytics.activeTable);

        this.S.analytics.agentData = data;
        this.S.analytics.cache[activeTab] = data;

        this.renderPane(activeTab);
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }

    getSampleData() {
      return {
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
        llm_model_used: "gpt-3.5-turbo-0125",
        llm_finish_reasons: "tool_calls,stop",
        input_size_chars: 1367,
        input_fields_count: 2,
        has_array_input: false,
        agent_description: "This agent will take the Metres input, and convert it to Miles using the unit_converter. It will also, take the Story and summarize it with the text_summary.",
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
        execution_sequence: "Unit_Converter->Text_Summary",
      };
    }

    buildSummaryHTML() {
      const data = this.S.analytics.agentData || this.getSampleData();

      return `
        <div class="page-header">
          <h2>Execution Summary</h2>
          <p class="page-description">
            Overview of the latest agent execution with key performance indicators
          </p>
        </div>

        <div class="overview-section">
          <div class="metric-card ${data.success ? 'success' : 'error'}">
            <div class="metric-icon">${data.success ? '✅' : '❌'}</div>
            <div class="metric-content">
              <h3>Execution Status</h3>
              <p class="metric-value">${data.success ? 'Success' : 'Failed'}</p>
              <p class="metric-description">Current execution state</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">⏱️</div>
            <div class="metric-content">
              <h3>Duration</h3>
              <p class="metric-value">${data.execution_duration_seconds?.toFixed(2) || '0'}s</p>
              <p class="metric-description">Total execution time</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">💰</div>
            <div class="metric-content">
              <h3>Cost</h3>
              <p class="metric-value">$${data.cost_estimate_usd?.toFixed(5) || '0.00000'}</p>
              <p class="metric-description">Estimated cost</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">🎯</div>
            <div class="metric-content">
              <h3>Efficiency</h3>
              <p class="metric-value">${Math.round((data.efficiency_score || 0) * 100)}%</p>
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
                <span class="detail-value">${data.agent_name || 'Unknown'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Execution Date:</span>
                <span class="detail-value">${data.execution_date || 'Unknown'}</span>
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
                <span class="detail-value">${(data.total_tokens_used || 0).toLocaleString()}</span>
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
                  <p>${data.most_used_tool || 'None'}</p>
                </div>
              </div>
              <div class="insight-item">
                <div class="insight-icon">🤖</div>
                <div class="insight-content">
                  <h4>Model</h4>
                  <p>${data.llm_model_used || 'Unknown'}</p>
                </div>
              </div>
              <div class="insight-item">
                <div class="insight-icon">✅</div>
                <div class="insight-content">
                  <h4>Validation</h4>
                  <p>${data.output_validation_success ? 'Passed' : 'Failed'}</p>
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

      const executionDetails = Object.entries(data)
        .filter(([key]) => !key.includes('raw_') && !key.includes('_list') && !key.includes('_ids'))
        .map(([key, value]) => `
          <tr>
            <td>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
            <td>${value}</td>
            <td>Agent execution data field</td>
          </tr>
        `).join('');

      return `
        <div class="page-header">
          <h2>Data Tables</h2>
          <p class="page-description">
            Comprehensive data fields and detailed information
          </p>
        </div>

        <div class="tables-section">
          <div class="table-container">
            <h3>Execution Data</h3>
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
                  ${executionDetails}
                </tbody>
              </table>
            </div>
          </div>
        </div>`;
    }

    createCharts() {
      const data = this.S.analytics.agentData || this.getSampleData();

      // Destroy existing charts
      Object.values(this.S.analytics.charts).forEach(chart => {
        if (chart && chart.destroy) chart.destroy();
      });
      this.S.analytics.charts = {};

      // Only create charts if Chart.js is available and we have canvas elements
      if (typeof Chart === 'undefined') {
        console.warn('Chart.js not available, skipping chart creation');
        return;
      }

      try {
        // Performance Chart
        const perfCanvas = document.getElementById('analytics-performanceChart');
        if (perfCanvas) {
          this.S.analytics.charts.performance = new Chart(perfCanvas, {
            type: 'bar',
            data: {
              labels: ['Duration (s)', 'Tools Used', 'LLM Calls', 'Events'],
              datasets: [{
                label: 'Performance Metrics',
                data: [
                  data.execution_duration_seconds || 0,
                  data.tools_used_count || 0,
                  data.total_llm_calls || 0,
                  data.total_events || 0
                ],
                backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false
            }
          });
        }

        // Token Usage Chart
        const tokenCanvas = document.getElementById('analytics-tokenChart');
        if (tokenCanvas) {
          this.S.analytics.charts.token = new Chart(tokenCanvas, {
            type: 'doughnut',
            data: {
              labels: ['Prompt Tokens', 'Completion Tokens'],
              datasets: [{
                data: [data.prompt_tokens_used || 0, data.completion_tokens_used || 0],
                backgroundColor: ['#667eea', '#764ba2']
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false
            }
          });
        }

        // Timeline Chart
        const timelineCanvas = document.getElementById('analytics-timelineChart');
        if (timelineCanvas) {
          this.S.analytics.charts.timeline = new Chart(timelineCanvas, {
            type: 'line',
            data: {
              labels: ['Start', 'Tool Calls', 'LLM Processing', 'End'],
              datasets: [{
                label: 'Execution Timeline',
                data: [0, 2, 4, data.execution_duration_seconds || 6],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Time (seconds)'
                  }
                }
              }
            }
          });
        }
      } catch (error) {
        console.error('Error creating charts:', error);
      }
    }
  }

  // Create global instance
  global.analyticsTabInstance = new AnalyticsTab();

  // Export to App namespace for consistency
  global.App = global.App || {};
  global.App.AnalyticsTab = AnalyticsTab;

})(window);