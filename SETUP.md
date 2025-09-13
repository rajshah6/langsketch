# Agent Analytics Dashboard - Databricks Integration Setup

This dashboard connects to your Databricks catalog to fetch and visualize agent execution data in real-time.

## Prerequisites

1. **Databricks Workspace**: You need access to a Databricks workspace
2. **SQL Warehouse**: A running SQL warehouse in your Databricks workspace
3. **Personal Access Token**: Generate a personal access token in Databricks
4. **Data Table**: Your agent execution data should be stored in a table with the expected schema

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Databricks Connection

1. Copy the example configuration:

   ```bash
   cp config.example.js config.js
   ```

2. Edit `config.js` with your Databricks credentials:

   ```javascript
   module.exports = {
     databricks: {
       serverHostname: "your-workspace-url", // e.g., adb-1234567890123456.7.azuredatabricks.net
       httpPath: "/sql/1.0/warehouses/your-warehouse-id",
       accessToken: "your-personal-access-token",
       catalog: "main", // or your specific catalog
       schema: "default", // or your specific schema
     },
     table: {
       agentExecutions: "agent_executions", // your table name
     },
   };
   ```

3. Set up environment variables (create a `.env` file):
   ```bash
   DATABRICKS_SERVER_HOSTNAME=your-databricks-workspace-url
   DATABRICKS_HTTP_PATH=your-http-path
   DATABRICKS_ACCESS_TOKEN=your-personal-access-token
   DATABRICKS_CATALOG=main
   DATABRICKS_SCHEMA=default
   ```

### 4. Get Your Databricks Credentials

#### Server Hostname

- Go to your Databricks workspace
- Copy the workspace URL (e.g., `https://adb-1234567890123456.7.azuredatabricks.net`)
- Remove `https://` and use just the hostname part

#### HTTP Path

- Go to SQL Warehouses in your Databricks workspace
- Click on your warehouse
- Copy the "Connection details" → "HTTP path" value

#### Personal Access Token

- Go to User Settings → Developer → Access tokens
- Click "Generate new token"
- Copy the generated token

### 5. Database Schema

Your Databricks table should have the following columns (matching the JSON structure):

```sql
CREATE TABLE agent_executions (
  agent_name STRING,
  execution_timestamp BIGINT,
  execution_date STRING,
  execution_hour STRING,
  execution_duration_ms DOUBLE,
  execution_duration_seconds DOUBLE,
  success BOOLEAN,
  error_message STRING,
  error_type STRING,
  total_events INT,
  total_tool_calls INT,
  total_llm_calls INT,
  avg_tool_call_duration_ms DOUBLE,
  avg_llm_call_duration_ms DOUBLE,
  total_tokens_used INT,
  prompt_tokens_used INT,
  completion_tokens_used INT,
  tokens_per_second DOUBLE,
  cost_estimate_usd DOUBLE,
  tools_used_count INT,
  tools_used_list STRING,
  most_used_tool STRING,
  most_used_tool_count INT,
  tool_names STRING,
  tool_call_ids STRING,
  tool_call_timestamps STRING,
  llm_model_used STRING,
  llm_finish_reasons STRING,
  llm_call_timestamps STRING,
  input_size_chars INT,
  input_fields_count INT,
  has_array_input BOOLEAN,
  agent_description STRING,
  available_tools_count INT,
  available_tools_list STRING,
  utilities_enabled STRING,
  apis_configured INT,
  tools_per_second DOUBLE,
  events_per_second DOUBLE,
  efficiency_score DOUBLE,
  has_validation_errors BOOLEAN,
  output_validation_success BOOLEAN,
  llm_errors INT,
  tool_errors INT,
  raw_input_data STRING,
  execution_sequence STRING
);
```

### 6. Run the Application

```bash
# Development mode (with DevTools)
npm run dev

# Production mode
npm start
```

## Features

- **Real-time Data**: Fetches latest execution data from Databricks
- **Interactive Charts**: Performance metrics, token usage, tool distribution
- **Data Tables**: Detailed execution information, tool performance, LLM calls
- **Export Functionality**: Export data as JSON
- **Error Handling**: Graceful error handling with user-friendly messages
- **Loading States**: Visual feedback during data loading

## Troubleshooting

### Connection Issues

- Verify your Databricks credentials are correct
- Ensure your SQL warehouse is running
- Check that your personal access token has the necessary permissions

### Data Issues

- Verify your table schema matches the expected format
- Check that your table contains data
- Ensure your catalog and schema names are correct

### Performance Issues

- Consider adding indexes to your table for better query performance
- Use LIMIT clauses for large datasets
- Monitor your SQL warehouse usage

## API Endpoints

The dashboard provides several IPC endpoints for data fetching:

- `get-latest-execution`: Get the most recent execution
- `get-agent-execution`: Get specific agent execution
- `get-execution-stats`: Get execution statistics
- `get-tool-usage-stats`: Get tool usage statistics
- `get-agent-performance`: Get agent performance over time
- `get-all-executions`: Get all executions with limit

## Security Notes

- Never commit your `config.js` file with real credentials
- Use environment variables in production
- Rotate your personal access tokens regularly
- Ensure proper network security for your Databricks workspace
