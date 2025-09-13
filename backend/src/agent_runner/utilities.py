import re
import json
import math
import dateparser
from pint import UnitRegistry
from asteval import Interpreter
from typing import Dict, Any, List
from urllib.parse import urlparse, parse_qs

from .agent_models import ToolConfig, ToolInputConfig, ToolOutputConfig, FieldConfig

# Initialize unit registry globally for the module
_ureg = UnitRegistry()

def regex_extract(text: str, pattern: str) -> List[str]:
    """Extract text patterns using regex"""
    try:
        return re.findall(pattern, text)
    except re.error:
        return []

def calculator(expression: str) -> float:
    """Safely evaluate mathematical expressions"""
    try:
        # Create a safe interpreter with only math functions
        interpreter = Interpreter()
        # Add common math functions to the interpreter
        interpreter.symtable['pi'] = math.pi
        interpreter.symtable['e'] = math.e
        interpreter.symtable['sqrt'] = math.sqrt
        interpreter.symtable['sin'] = math.sin
        interpreter.symtable['cos'] = math.cos
        interpreter.symtable['tan'] = math.tan
        interpreter.symtable['log'] = math.log
        interpreter.symtable['log10'] = math.log10
        interpreter.symtable['exp'] = math.exp
        interpreter.symtable['abs'] = abs
        interpreter.symtable['round'] = round
        
        result = interpreter.eval(expression)
        if result is None:
            raise ValueError("Invalid mathematical expression")
        return float(result)
    except Exception as e:
        raise ValueError(f"Invalid mathematical expression: {str(e)}")

def date_parser(text: str, output_format: str = "iso") -> str:
    """Parse dates from text"""
    try:
        parsed_date = dateparser.parse(text)
        if parsed_date:
            if output_format == "iso":
                return parsed_date.isoformat()
            elif output_format == "unix":
                return str(int(parsed_date.timestamp()))
            else:
                return parsed_date.strftime(output_format)
        return ""
    except:
        return ""

def string_ops(action: str, text: str, extra: Dict[str, Any] = None) -> str:
    """Perform string operations"""
    if extra is None:
        extra = {}
        
    if action == "lowercase":
        return text.lower()
    elif action == "uppercase":
        return text.upper()
    elif action == "trim":
        return text.strip()
    elif action == "replace":
        old, new = extra.get("old", ""), extra.get("new", "")
        return text.replace(old, new)
    elif action == "substring":
        start = extra.get("start", 0)
        end = extra.get("end", len(text))
        return text[start:end]
    return text

def json_parser(json_str: str, fields: List[str] = None) -> Dict[str, Any]:
    """Parse JSON and extract specific fields"""
    try:
        data = json.loads(json_str)
        if not fields:
            return data
        
        result = {}
        for field in fields:
            if "." in field:
                # Handle nested fields like "weather.temp.current"
                keys = field.split(".")
                value = data
                for key in keys:
                    if isinstance(value, dict) and key in value:
                        value = value[key]
                    else:
                        value = None
                        break
                result[keys[-1]] = value
            else:
                result[field] = data.get(field)
        return result
    except json.JSONDecodeError:
        return {}

def unit_converter(value: float, from_unit: str, to_unit: str) -> float:
    """Convert between units"""
    try:
        quantity = _ureg(f"{value} {from_unit}")
        converted = quantity.to(to_unit)
        return float(converted.magnitude)
    except:
        raise ValueError(f"Cannot convert {from_unit} to {to_unit}")

def text_summary(text: str, mode: str = "short") -> str:
    """Summarize text (placeholder for now)"""
    # TODO: Implement with local LLM or external API
    if mode == "short":
        return text[:100] + "..." if len(text) > 100 else text
    elif mode == "medium":
        return text[:250] + "..." if len(text) > 250 else text
    return text

def number_stats(numbers: List[float]) -> Dict[str, float]:
    """Compute statistics on numbers"""
    if not numbers:
        return {}
    
    sorted_nums = sorted(numbers)
    n = len(numbers)
    
    return {
        "min": min(numbers),
        "max": max(numbers),
        "mean": sum(numbers) / n,
        "median": sorted_nums[n//2] if n % 2 == 1 else (sorted_nums[n//2-1] + sorted_nums[n//2]) / 2,
        "count": n,
        "sum": sum(numbers)
    }

def list_ops(action: str, list_data: List[Any], extra: Dict[str, Any] = None) -> Any:
    """Perform list operations"""
    if extra is None:
        extra = {}
        
    if action == "map":
        operation = extra.get("operation", "identity")
        if operation == "square":
            return [x**2 for x in list_data if isinstance(x, (int, float))]
        elif operation == "double":
            return [x*2 for x in list_data if isinstance(x, (int, float))]
    elif action == "filter":
        condition = extra.get("condition", "all")
        if condition == "even":
            return [x for x in list_data if isinstance(x, int) and x % 2 == 0]
        elif condition == "positive":
            return [x for x in list_data if isinstance(x, (int, float)) and x > 0]
    elif action == "reduce":
        operation = extra.get("operation", "sum")
        if operation == "sum":
            return sum(x for x in list_data if isinstance(x, (int, float)))
        elif operation == "product":
            result = 1
            for x in list_data:
                if isinstance(x, (int, float)):
                    result *= x
            return result
    return list_data

def url_parser(url: str) -> Dict[str, Any]:
    """Parse URL components"""
    try:
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query) if parsed.query else {}
        
        return {
            "scheme": parsed.scheme,
            "domain": parsed.netloc,
            "path": parsed.path,
            "query": query_params,
            "fragment": parsed.fragment
        }
    except:
        return {}

# Dictionary mapping function names to actual functions
UTILITY_FUNCTIONS = {
    "regex_extract": regex_extract,
    "calculator": calculator,
    "date_parser": date_parser,
    "string_ops": string_ops,
    "json_parser": json_parser,
    "unit_converter": unit_converter,
    "text_summary": text_summary,
    "number_stats": number_stats,
    "list_ops": list_ops,
    "url_parser": url_parser
}

# Tool configurations for each builtin tool
UTILITY_CONFIGS = [
    ToolConfig(
        name="Regex Extract",
        description="Extract text patterns using regular expressions",
        inputs=ToolInputConfig(fields=[
            FieldConfig(name="text", type="string", description="Input text to search", required=True),
            FieldConfig(name="pattern", type="string", description="Regular expression pattern", required=True)
        ]),
        output=ToolOutputConfig(is_array=True, fields=[
            FieldConfig(name="matches", type="list", description="List of matching strings", required=True)
        ]),
        code_path="__builtin__",
        function_name="regex_extract"
    ),
    ToolConfig(
        name="Calculator",
        description="Safely evaluate mathematical expressions",
        inputs=ToolInputConfig(fields=[
            FieldConfig(name="expression", type="string", description="Mathematical expression to evaluate", required=True)
        ]),
        output=ToolOutputConfig(is_array=False, fields=[
            FieldConfig(name="result", type="float", description="Result of the calculation", required=True)
        ]),
        code_path="__builtin__",
        function_name="calculator"
    ),
    ToolConfig(
        name="Date Parser",
        description="Parse dates from text into various formats",
        inputs=ToolInputConfig(fields=[
            FieldConfig(name="text", type="string", description="Text containing date to parse", required=True),
            FieldConfig(name="output_format", type="string", description="Output format (iso, unix, or custom format)", required=False)
        ]),
        output=ToolOutputConfig(is_array=False, fields=[
            FieldConfig(name="parsed_date", type="string", description="Parsed date in requested format", required=True)
        ]),
        code_path="__builtin__",
        function_name="date_parser"
    ),
    ToolConfig(
        name="String Operations",
        description="Perform various string operations like lowercase, trim, replace, substring",
        inputs=ToolInputConfig(fields=[
            FieldConfig(name="action", type="string", description="Action to perform (lowercase, uppercase, trim, replace, substring)", required=True),
            FieldConfig(name="text", type="string", description="Input text to process", required=True),
            FieldConfig(name="extra", type="dict", description="Extra parameters (old/new for replace, start/end for substring)", required=False)
        ]),
        output=ToolOutputConfig(is_array=False, fields=[
            FieldConfig(name="result", type="string", description="Processed text result", required=True)
        ]),
        code_path="__builtin__",
        function_name="string_ops"
    ),
    ToolConfig(
        name="JSON Parser",
        description="Parse JSON strings and extract specific fields",
        inputs=ToolInputConfig(fields=[
            FieldConfig(name="json_str", type="string", description="JSON string to parse", required=True),
            FieldConfig(name="fields", type="list", description="List of fields to extract (optional)", required=False)
        ]),
        output=ToolOutputConfig(is_array=False, fields=[
            FieldConfig(name="parsed_data", type="dict", description="Parsed JSON data", required=True)
        ]),
        code_path="__builtin__",
        function_name="json_parser"
    ),
    ToolConfig(
        name="Unit Converter",
        description="Convert values between different units",
        inputs=ToolInputConfig(fields=[
            FieldConfig(name="value", type="float", description="Value to convert", required=True),
            FieldConfig(name="from_unit", type="string", description="Source unit", required=True),
            FieldConfig(name="to_unit", type="string", description="Target unit", required=True)
        ]),
        output=ToolOutputConfig(is_array=False, fields=[
            FieldConfig(name="converted_value", type="float", description="Converted value", required=True)
        ]),
        code_path="__builtin__",
        function_name="unit_converter"
    ),
    ToolConfig(
        name="Text Summary",
        description="Summarize text content",
        inputs=ToolInputConfig(fields=[
            FieldConfig(name="text", type="string", description="Text to summarize", required=True),
            FieldConfig(name="mode", type="string", description="Summary mode (short, medium, long)", required=False)
        ]),
        output=ToolOutputConfig(is_array=False, fields=[
            FieldConfig(name="summary", type="string", description="Summarized text", required=True)
        ]),
        code_path="__builtin__",
        function_name="text_summary"
    ),
    ToolConfig(
        name="Number Statistics",
        description="Compute statistics on a list of numbers",
        inputs=ToolInputConfig(fields=[
            FieldConfig(name="numbers", type="list", description="List of numbers to analyze", required=True)
        ]),
        output=ToolOutputConfig(is_array=False, fields=[
            FieldConfig(name="stats", type="dict", description="Statistical measures (min, max, mean, median, etc.)", required=True)
        ]),
        code_path="__builtin__",
        function_name="number_stats"
    ),
    ToolConfig(
        name="List Operations",
        description="Perform operations on lists (map, filter, reduce)",
        inputs=ToolInputConfig(fields=[
            FieldConfig(name="action", type="string", description="Operation to perform (map, filter, reduce)", required=True),
            FieldConfig(name="list_data", type="list", description="Input list to process", required=True),
            FieldConfig(name="extra", type="dict", description="Extra parameters for the operation", required=False)
        ]),
        output=ToolOutputConfig(is_array=False, fields=[
            FieldConfig(name="result", type="object", description="Result of the list operation", required=True)
        ]),
        code_path="__builtin__",
        function_name="list_ops"
    ),
    ToolConfig(
        name="URL Parser",
        description="Parse URL components into structured data",
        inputs=ToolInputConfig(fields=[
            FieldConfig(name="url", type="string", description="URL to parse", required=True)
        ]),
        output=ToolOutputConfig(is_array=False, fields=[
            FieldConfig(name="components", type="dict", description="URL components (scheme, domain, path, query, fragment)", required=True)
        ]),
        code_path="__builtin__",
        function_name="url_parser"
    )
]