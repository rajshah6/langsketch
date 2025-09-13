// Databricks Configuration
// Copy this file to config.js and fill in your actual values

module.exports = {
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

// Environment variables needed:
// DATABRICKS_SERVER_HOSTNAME=your-databricks-workspace-url
// DATABRICKS_HTTP_PATH=your-http-path
// DATABRICKS_ACCESS_TOKEN=your-personal-access-token
// DATABRICKS_CATALOG=main
// DATABRICKS_SCHEMA=default
