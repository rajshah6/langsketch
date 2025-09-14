from databricks.sdk import WorkspaceClient
import json
import os
from typing import List, Dict, Any

def escape_sql_string(value: str) -> str:
    """Escape single quotes in SQL string values"""
    return str(value).replace("'", "''") if value else ''


def describe_json(data: List[Dict[str, Any]], indent: int = 0):
    prefix = " " * indent
    if isinstance(data, list):
        print(f"{prefix}List[{len(data)} items]")
        if data:  # look at the first element
            describe_json(data[0], indent + 2)
    elif isinstance(data, dict):
        print(f"{prefix}Dict with {len(data)} keys:")
        for key, value in data.items():
            print(f"{prefix}  - {key}: {type(value).__name__}")
            if isinstance(value, (dict, list)):
                describe_json(value, indent + 4)
    else:
        print(f"{prefix}{type(data).__name__}")

def upload_agent_data_to_databricks(agent_name: str, json_data: List[Dict[str, Any]], table_name: str = "default.agent_logs4") -> bool:
    """
    Upload agent execution data to Databricks table
    
    Args:
        agent_name: Name of the agent
        json_data: List of dictionaries containing agent execution data
        table_name: Databricks table name (optional, defaults to "default.agent_logs4")
    
    Returns:
        bool: True if successful, False otherwise
    """
    
    describe_json(json_data)
    
    try:
        # Initialize Databricks client
        print(f"Initializing Databricks client for agent: {agent_name}")
        w = WorkspaceClient()

        # Get available warehouse
        warehouses = w.warehouses.list()
        if not warehouses:
            raise Exception("No warehouses available in workspace")
        
        warehouse_id = warehouses[0].id
        print(f"Using warehouse: {warehouse_id}")

        if not json_data:
            raise Exception("No records found in JSON data")
        
        print(f"Processing {len(json_data)} records for agent: {agent_name}")

        # 1. Create table if not exists
        print("Creating table if not exists...")
        create_table_sql = f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
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
        ) USING delta
        """
        
        result = w.statement_execution.execute_statement(
            warehouse_id=warehouse_id,
            statement=create_table_sql
        )
        print("Table created/verified successfully")

        # 2. Insert data with proper escaping
        print("Inserting records...")
        for i, rec in enumerate(json_data):
            insert_sql = f"""
            INSERT INTO {table_name}
            (agent_name, execution_timestamp, execution_date, execution_hour, execution_duration_ms, 
             execution_duration_seconds, success, error_message, error_type, total_events, 
             total_tool_calls, total_llm_calls, avg_tool_call_duration_ms, avg_llm_call_duration_ms,
             total_tokens_used, prompt_tokens_used, completion_tokens_used, tokens_per_second,
             cost_estimate_usd, tools_used_count, tools_used_list, most_used_tool, most_used_tool_count,
             tool_names, tool_call_ids, tool_call_timestamps, llm_model_used, llm_finish_reasons,
             llm_call_timestamps, input_size_chars, input_fields_count, has_array_input,
             agent_description, available_tools_count, available_tools_list, utilities_enabled,
             apis_configured, tools_per_second, events_per_second, efficiency_score,
             has_validation_errors, output_validation_success, llm_errors, tool_errors,
             raw_input_data, execution_sequence)
            VALUES (
                '{escape_sql_string(agent_name)}',
                {rec.get("execution_timestamp", 0)},
                '{escape_sql_string(rec.get("execution_date"))}',
                '{escape_sql_string(rec.get("execution_hour"))}',
                {rec.get("execution_duration_ms", 0.0)},
                {rec.get("execution_duration_seconds", 0.0)},
                {str(rec.get("success", False)).lower()},
                '{escape_sql_string(rec.get("error_message"))}',
                '{escape_sql_string(rec.get("error_type"))}',
                {rec.get("total_events", 0)},
                {rec.get("total_tool_calls", 0)},
                {rec.get("total_llm_calls", 0)},
                {rec.get("avg_tool_call_duration_ms", 0.0)},
                {rec.get("avg_llm_call_duration_ms", 0.0)},
                {rec.get("total_tokens_used", 0)},
                {rec.get("prompt_tokens_used", 0)},
                {rec.get("completion_tokens_used", 0)},
                {rec.get("tokens_per_second", 0.0)},
                {rec.get("cost_estimate_usd", 0.0)},
                {rec.get("tools_used_count", 0)},
                '{escape_sql_string(rec.get("tools_used_list"))}',
                '{escape_sql_string(rec.get("most_used_tool"))}',
                {rec.get("most_used_tool_count", 0)},
                '{escape_sql_string(rec.get("tool_names"))}',
                '{escape_sql_string(rec.get("tool_call_ids"))}',
                '{escape_sql_string(rec.get("tool_call_timestamps"))}',
                '{escape_sql_string(rec.get("llm_model_used"))}',
                '{escape_sql_string(rec.get("llm_finish_reasons"))}',
                '{escape_sql_string(rec.get("llm_call_timestamps"))}',
                {rec.get("input_size_chars", 0)},
                {rec.get("input_fields_count", 0)},
                {str(rec.get("has_array_input", False)).lower()},
                '{escape_sql_string(rec.get("agent_description"))}',
                {rec.get("available_tools_count", 0)},
                '{escape_sql_string(rec.get("available_tools_list"))}',
                '{escape_sql_string(rec.get("utilities_enabled"))}',
                {rec.get("apis_configured", 0)},
                {rec.get("tools_per_second", 0.0)},
                {rec.get("events_per_second", 0.0)},
                {rec.get("efficiency_score", 0.0)},
                {str(rec.get("has_validation_errors", False)).lower()},
                {str(rec.get("output_validation_success", True)).lower()},
                {rec.get("llm_errors", 0)},
                {rec.get("tool_errors", 0)},
                '{escape_sql_string(str(rec.get("raw_input_data")))}',
                '{escape_sql_string(rec.get("execution_sequence"))}'
            )
            """
            
            w.statement_execution.execute_statement(
                warehouse_id=warehouse_id,
                statement=insert_sql
            )
            print(f"Inserted record {i+1}/{len(json_data)} for agent: {agent_name}")

        # 3. Query table for verification
        print(f"Querying data for agent: {agent_name}...")
        query_sql = f"""
        SELECT 
            agent_name,
            most_used_tool,
            tools_used_count,
            total_tool_calls,
            execution_duration_seconds,
            efficiency_score
        FROM {table_name} 
        WHERE agent_name = '{escape_sql_string(agent_name)}'
        ORDER BY execution_timestamp DESC
        """
        
        result = w.statement_execution.execute_statement(
            warehouse_id=warehouse_id,
            statement=query_sql
        )

        print(f"\n=== Agent Execution Analysis for {agent_name} ===")
        if result.result and result.result.data_array:
            for row in result.result.data_array:
                print(f"Agent: {row[0]}, Most Used Tool: {row[1]}, Tools Count: {row[2]}, Tool Calls: {row[3]}, Duration: {row[4]}s, Efficiency: {row[5]}")
        else:
            print("No results returned from query")

        print(f"Data upload completed successfully for agent: {agent_name}!")
        return True

    except Exception as e:
        print(f"Error uploading data for agent {agent_name}: {e}")
        print("Common issues to check:")
        print("1. Databricks authentication (DATABRICKS_HOST, DATABRICKS_TOKEN)")
        print("2. Warehouse availability")
        print("3. JSON data format")
        print("4. Network connectivity")
        return False

# # Example usage:
# if __name__ == "__main__":
#     # Sample usage
#     sample_data = [
#                     {
#             "agent_name": "ConvertMilesStorySummary",
#             "execution_timestamp": 1757783142,
#             "execution_date": "2025-09-13",
#             "execution_hour": "13:00:00",
#             "execution_duration_ms": 6823.96,
#             "execution_duration_seconds": 6.824,
#             "success": True,
#             "error_message": "",
#             "error_type": "",
#             "total_events": 4,
#             "total_tool_calls": 2,
#             "total_llm_calls": 2,
#             "avg_tool_call_duration_ms": 3411.98,
#             "avg_llm_call_duration_ms": 3411.98,
#             "total_tokens_used": 2320,
#             "prompt_tokens_used": 1687,
#             "completion_tokens_used": 633,
#             "tokens_per_second": 339.98,
#             "cost_estimate_usd": 0.00348,
#             "tools_used_count": 2,
#             "tools_used_list": "Text_Summary,Unit_Converter",
#             "most_used_tool": "Unit_Converter",
#             "most_used_tool_count": 1,
#             "tool_names": "Unit_Converter,Text_Summary",
#             "tool_call_ids": "call_aS7KhFDjBy0jncuOX0ZnouN7,call_ZIyfp8PXRvBHDpsQ2LWB3dnr",
#             "tool_call_timestamps": "1757783145,1757783145",
#             "llm_model_used": "gpt-3.5-turbo-0125",
#             "llm_finish_reasons": "tool_calls,stop",
#             "llm_call_timestamps": "1757783145,1757783149",
#             "input_size_chars": 1367,
#             "input_fields_count": 2,
#             "has_array_input": False,
#             "agent_description": "This agent will take the Metres input, and convert it to Miles using the unit_converter. It will also, take the Story and summarize it with the text_summary.",
#             "available_tools_count": 2,
#             "available_tools_list": "Text_Summary,Unit_Converter",
#             "utilities_enabled": "text_summary,unit_converter",
#             "apis_configured": 0,
#             "tools_per_second": 0.29,
#             "events_per_second": 0.59,
#             "efficiency_score": 0.59,
#             "has_validation_errors": False,
#             "output_validation_success": True,
#             "llm_errors": 0,
#             "tool_errors": 0,
#             "raw_input_data": "{'Metres': 9, 'Story': 'In a small quiet village there lived a girl who always dreamed of the sea. She had never seen the water with her own eyes yet she felt the waves inside her heart. Each night she imagined a horizon where the sky touched the endless blue and she promised herself that one day she would stand there in the wind and hear the ocean speak. The people of the village often told her that dreams were soft and fragile like clouds. They warned her that travel was hard and the sea was c",
#             "execution_sequence": "Unit_Converter->Text_Summary"
#             }
#     ]
    
#     success = upload_agent_data_to_databricks("test_agent", sample_data, "default.test_table")
#     print(f"Upload successful: {success}")


def test_local(agent_name, table_name):
    # Sample usage
    sample_data = [
        {
            "agent_name": "add-10",
            "execution_timestamp": 1757799783,
            "execution_date": "2025-09-13",
            "execution_hour": "17:00:00",
            "execution_duration_ms": 518.96,
            "execution_duration_seconds": 0.519,
            "success": True,
            "error_message": "",
            "error_type": "",
            "total_events": 1,
            "total_tool_calls": 0,
            "total_llm_calls": 1,
            "avg_tool_call_duration_ms": 0,
            "avg_llm_call_duration_ms": 518.96,
            "total_tokens_used": 207,
            "prompt_tokens_used": 198,
            "completion_tokens_used": 9,
            "tokens_per_second": 398.87,
            "cost_estimate_usd": 0.000311,
            "tools_used_count": 0,
            "tools_used_list": "",
            "most_used_tool": "",
            "most_used_tool_count": 0,
            "tool_names": "",
            "tool_call_ids": "",
            "tool_call_timestamps": "",
            "llm_model_used": "gpt-3.5-turbo-0125",
            "llm_finish_reasons": "stop",
            "llm_call_timestamps": "1757799783",
            "input_size_chars": 13,
            "input_fields_count": 1,
            "has_array_input": False,
            "agent_description": "add 10 to the number that is inputted",
            "available_tools_count": 0,
            "available_tools_list": "",
            "utilities_enabled": "",
            "apis_configured": 0,
            "tools_per_second": 0,
            "events_per_second": 1.93,
            "efficiency_score": 1.93,
            "has_validation_errors": False,
            "output_validation_success": False,
            "llm_errors": 0,
            "tool_errors": 0,
            "raw_input_data": "{'number': 7}",
            "execution_sequence": "none"
        }
    ]
    filename = f"{agent_name}_output_json.json"
    with open(filename, "r") as f:
        data = json.load(f)
    success = upload_agent_data_to_databricks(agent_name, data, f"default.{agent_name}")
    print(f"Upload successful: {success}")

