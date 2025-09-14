// Databricks Configuration for Analytics
// This config works with the main Electron app's credential system

const defaultConfig = {
  databricks: {
    serverHostname: "your-databricks-workspace-url", // e.g., adb-1234567890123456.7.azuredatabricks.net
    httpPath: "your-http-path", // e.g., /sql/1.0/warehouses/your-warehouse-id
    accessToken: "your-personal-access-token",
    catalog: "main", // or your specific catalog
    schema: "default", // or your specific schema
  },
  table: {
    agentExecutions: "agent_executions", // your table name
  },
};

// Function to get config via IPC from main process
async function getConfig() {
  try {
    const { ipcRenderer } = require("electron");
    const result = await ipcRenderer.invoke("get-databricks-config");
    if (result && result.success) {
      return result.config;
    }
  } catch (error) {
    console.warn("Could not get config from main process, using defaults:", error);
  }
  return defaultConfig;
}

// Export both default config and async config getter
module.exports = {
  defaultConfig,
  getConfig,
};
