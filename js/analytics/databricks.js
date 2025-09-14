// Note: This file is designed to work in both Node.js and browser environments
// In Node.js, we'll use require, in browser we'll use dynamic imports

let DBSQLClient;
let dotenv;

// Try to load modules if in Node.js environment
try {
  if (typeof require !== "undefined") {
    DBSQLClient = require("@databricks/sql").DBSQLClient;
    dotenv = require("dotenv");
    dotenv.config();
  }
} catch (error) {
  console.warn("Databricks SQL client not available:", error.message);
}

class DatabricksClient {
  constructor() {
    if (!DBSQLClient) {
      throw new Error(
        "Databricks SQL client is not available. Please install @databricks/sql package."
      );
    }
    this.client = new DBSQLClient();
    this.connection = null;
  }

  async connect() {
    try {
      // Check if required environment variables are set
      const hostname =
        process.env.DATABRICKS_SERVER_HOSTNAME ||
        "dbc-2f5ab88f-ea86.cloud.databricks.com";
      const httpPath =
        process.env.DATABRICKS_HTTP_PATH ||
        "/sql/1.0/warehouses/your-warehouse-id";
      const accessToken =
        process.env.DATABRICKS_ACCESS_TOKEN || "your-personal-access-token";

      if (accessToken === "your-personal-access-token") {
        console.log(
          "Databricks access token not configured, using mock data. Please set DATABRICKS_ACCESS_TOKEN environment variable."
        );
        return false;
      }

      this.connection = await this.client.connect({
        host: hostname,
        path: httpPath,
        token: accessToken,
        catalog: process.env.DATABRICKS_CATALOG || "main",
        schema: process.env.DATABRICKS_SCHEMA || "default",
      });
      console.log("Connected to Databricks successfully");
      return true;
    } catch (error) {
      console.error("Failed to connect to Databricks:", error);
      return false;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      console.log("Disconnected from Databricks");
    }
  }

  async executeQuery(query, params = []) {
    if (!this.connection) {
      throw new Error("Not connected to Databricks. Call connect() first.");
    }

    try {
      const session = await this.connection.openSession();
      const queryOperation = await session.executeStatement(query, {
        parameters: params,
      });

      const result = await queryOperation.fetchAll();
      await queryOperation.close();
      await session.close();

      return result;
    } catch (error) {
      console.error("Query execution failed:", error);
      throw error;
    }
  }

  // Get all agent execution records
  async getAllAgentExecutions(limit = 100) {
    const query = `
      SELECT 
        agent_name,
        execution_timestamp,
        execution_date,
        execution_hour,
        execution_duration_ms,
        execution_duration_seconds,
        success,
        error_message,
        error_type,
        total_events,
        total_tool_calls,
        total_llm_calls,
        avg_tool_call_duration_ms,
        avg_llm_call_duration_ms,
        total_tokens_used,
        prompt_tokens_used,
        completion_tokens_used,
        tokens_per_second,
        cost_estimate_usd,
        tools_used_count,
        tools_used_list,
        most_used_tool,
        most_used_tool_count,
        tool_names,
        tool_call_ids,
        tool_call_timestamps,
        llm_model_used,
        llm_finish_reasons,
        llm_call_timestamps,
        input_size_chars,
        input_fields_count,
        has_array_input,
        agent_description,
        available_tools_count,
        available_tools_list,
        utilities_enabled,
        apis_configured,
        tools_per_second,
        events_per_second,
        efficiency_score,
        has_validation_errors,
        output_validation_success,
        llm_errors,
        tool_errors,
        raw_input_data,
        execution_sequence
      FROM agent_executions 
      ORDER BY execution_timestamp DESC 
      LIMIT ?
    `;

    return await this.executeQuery(query, [limit]);
  }

  // Get specific agent execution by ID or name
  async getAgentExecution(agentName, executionDate = null) {
    let query = `
      SELECT 
        agent_name,
        execution_timestamp,
        execution_date,
        execution_hour,
        execution_duration_ms,
        execution_duration_seconds,
        success,
        error_message,
        error_type,
        total_events,
        total_tool_calls,
        total_llm_calls,
        avg_tool_call_duration_ms,
        avg_llm_call_duration_ms,
        total_tokens_used,
        prompt_tokens_used,
        completion_tokens_used,
        tokens_per_second,
        cost_estimate_usd,
        tools_used_count,
        tools_used_list,
        most_used_tool,
        most_used_tool_count,
        tool_names,
        tool_call_ids,
        tool_call_timestamps,
        llm_model_used,
        llm_finish_reasons,
        llm_call_timestamps,
        input_size_chars,
        input_fields_count,
        has_array_input,
        agent_description,
        available_tools_count,
        available_tools_list,
        utilities_enabled,
        apis_configured,
        tools_per_second,
        events_per_second,
        efficiency_score,
        has_validation_errors,
        output_validation_success,
        llm_errors,
        tool_errors,
        raw_input_data,
        execution_sequence
      FROM agent_executions 
      WHERE agent_name = ?
    `;

    const params = [agentName];

    if (executionDate) {
      query += " AND execution_date = ?";
      params.push(executionDate);
    }

    query += " ORDER BY execution_timestamp DESC LIMIT 1";

    const results = await this.executeQuery(query, params);
    return results.length > 0 ? results[0] : null;
  }

  // Get latest execution for dashboard
  async getLatestExecution() {
    const query = `
      SELECT 
        agent_name,
        execution_timestamp,
        execution_date,
        execution_hour,
        execution_duration_ms,
        execution_duration_seconds,
        success,
        error_message,
        error_type,
        total_events,
        total_tool_calls,
        total_llm_calls,
        avg_tool_call_duration_ms,
        avg_llm_call_duration_ms,
        total_tokens_used,
        prompt_tokens_used,
        completion_tokens_used,
        tokens_per_second,
        cost_estimate_usd,
        tools_used_count,
        tools_used_list,
        most_used_tool,
        most_used_tool_count,
        tool_names,
        tool_call_ids,
        tool_call_timestamps,
        llm_model_used,
        llm_finish_reasons,
        llm_call_timestamps,
        input_size_chars,
        input_fields_count,
        has_array_input,
        agent_description,
        available_tools_count,
        available_tools_list,
        utilities_enabled,
        apis_configured,
        tools_per_second,
        events_per_second,
        efficiency_score,
        has_validation_errors,
        output_validation_success,
        llm_errors,
        tool_errors,
        raw_input_data,
        execution_sequence
      FROM agent_executions 
      ORDER BY execution_timestamp DESC 
      LIMIT 1
    `;

    const results = await this.executeQuery(query);
    return results.length > 0 ? results[0] : null;
  }

  // Get execution statistics
  async getExecutionStats(days = 7) {
    const query = `
      SELECT 
        COUNT(*) as total_executions,
        AVG(execution_duration_seconds) as avg_duration,
        AVG(cost_estimate_usd) as avg_cost,
        AVG(efficiency_score) as avg_efficiency,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_executions,
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_executions,
        AVG(total_tokens_used) as avg_tokens,
        AVG(tools_per_second) as avg_tools_per_second
      FROM agent_executions 
      WHERE execution_date >= DATE_SUB(CURRENT_DATE(), ?)
    `;

    const results = await this.executeQuery(query, [days]);
    return results.length > 0 ? results[0] : null;
  }

  // Get tool usage statistics
  async getToolUsageStats(days = 7) {
    const query = `
      SELECT 
        tool_names,
        COUNT(*) as usage_count,
        AVG(avg_tool_call_duration_ms) as avg_duration_ms
      FROM agent_executions 
      WHERE execution_date >= DATE_SUB(CURRENT_DATE(), ?)
      GROUP BY tool_names
      ORDER BY usage_count DESC
    `;

    return await this.executeQuery(query, [days]);
  }

  // Get agent performance over time
  async getAgentPerformanceOverTime(agentName, days = 30) {
    const query = `
      SELECT 
        execution_date,
        execution_hour,
        execution_duration_seconds,
        success,
        cost_estimate_usd,
        efficiency_score,
        total_tokens_used
      FROM agent_executions 
      WHERE agent_name = ? 
        AND execution_date >= DATE_SUB(CURRENT_DATE(), ?)
      ORDER BY execution_timestamp ASC
    `;

    return await this.executeQuery(query, [agentName, days]);
  }

  // Get all available tables in the default schema, sorted by creation date (most recent first)
  async getAvailableTables() {
    const query = `
      SELECT table_name, create_time
      FROM information_schema.tables 
      WHERE table_schema = 'default' 
      ORDER BY create_time DESC
    `;

    try {
      const results = await this.executeQuery(query);
      return results.map((row) => ({
        name: row.table_name,
        createTime: row.create_time,
      }));
    } catch (error) {
      // Fallback to simple SHOW TABLES if information_schema is not available
      console.log("Falling back to SHOW TABLES query");
      const fallbackQuery = `SHOW TABLES IN workspace.default`;
      const results = await this.executeQuery(fallbackQuery);
      return results.map((row) => ({
        name: row.tableName || row.table_name,
        createTime: null,
      }));
    }
  }

  // Query a specific table by name
  async queryTable(tableName, limit = 100) {
    const query = `
      SELECT * FROM workspace.default.${tableName}
      LIMIT ${limit}
    `;

    return await this.executeQuery(query);
  }

  // Get table schema information
  async getTableSchema(tableName) {
    const query = `
      DESCRIBE TABLE workspace.default.${tableName}
    `;

    return await this.executeQuery(query);
  }
}

module.exports = DatabricksClient;
