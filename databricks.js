const { DBSQLClient } = require("@databricks/sql");
require("dotenv").config();

class DatabricksClient {
  constructor() {
    this.client = new DBSQLClient();
    this.connection = null;
  }

  async connect() {
    try {
      // Check if required environment variables are set
      if (
        !process.env.DATABRICKS_SERVER_HOSTNAME ||
        !process.env.DATABRICKS_HTTP_PATH ||
        !process.env.DATABRICKS_ACCESS_TOKEN
      ) {
        console.log(
          "Databricks environment variables not configured, skipping connection"
        );
        return false;
      }

      this.connection = await this.client.connect({
        host: process.env.DATABRICKS_SERVER_HOSTNAME,
        path: process.env.DATABRICKS_HTTP_PATH,
        token: process.env.DATABRICKS_ACCESS_TOKEN,
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
}

module.exports = DatabricksClient;
