# Databricks Integration

This document explains how the Databricks analytics page has been integrated into the main LangSketch application.

## Overview

The Databricks page has been added as a new tab in the agents section, providing analytics and data visualization for agent executions stored in Databricks.

## Features

- **Summary Dashboard**: Overview of latest agent execution with key performance indicators
- **Metrics Visualization**: Charts showing performance metrics, token usage, and execution timeline
- **Data Tables**: Detailed tables showing execution details, tool performance, and LLM usage
- **Table Selection**: Ability to select and query different Databricks tables
- **Real-time Data**: Connects to live Databricks data (with fallback to mock data)

## Configuration

To use the Databricks integration, you need to set up environment variables:

1. Create a `.env` file in the project root
2. Add your Databricks credentials:

```env
DATABRICKS_SERVER_HOSTNAME=your-databricks-workspace-url
DATABRICKS_HTTP_PATH=your-http-path
DATABRICKS_ACCESS_TOKEN=your-personal-access-token
DATABRICKS_CATALOG=main
DATABRICKS_SCHEMA=default
```

## Files Added/Modified

### New Files

- `js/databricks-tab.js` - Main databricks tab component
- `databricks-client.js` - Databricks client for data access
- `DATABRICKS_INTEGRATION.md` - This documentation

### Modified Files

- `index.html` - Added databricks navigation button and required libraries
- `js/settings_and_nav.js` - Added databricks case to switchProjectView
- `main.js` - Added databricks client initialization and IPC handlers
- `package.json` - Added databricks dependencies

## Dependencies Added

- `@databricks/sql` - Databricks SQL connector
- `dotenv` - Environment variable management
- `chart.js` - Chart visualization (loaded via CDN)
- `font-awesome` - Icons (loaded via CDN)

## Usage

1. Open a project folder in LangSketch
2. Navigate to the "Agents" tab
3. Click on the "Databricks" tab
4. The page will attempt to connect to Databricks and load data
5. If connection fails, mock data will be displayed

## Data Structure

The integration expects the following Databricks table structure:

- `agent_executions` - Main table with execution data
- Additional tables can be queried via the table selector

## Error Handling

- Graceful fallback to mock data if Databricks connection fails
- Error messages displayed in the UI
- Console logging for debugging

## Future Enhancements

- Real-time data updates
- Export functionality
- Advanced filtering and search
- Custom dashboard configuration
