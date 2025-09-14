from langchain_openai import ChatOpenAI
from langchain_core.messages import ToolMessage, AIMessage, HumanMessage

class DeimosCompatibleChatOpenAI(ChatOpenAI):
    def _convert_messages_for_deimos(self, messages):
        """Convert LangGraph messages to Deimos-compatible format"""
        converted = []
        
        for i, msg in enumerate(messages):
            if isinstance(msg, ToolMessage):
                converted.append(HumanMessage(
                    content=f"Tool {msg.name} returned: {msg.content}"
                ))
            elif isinstance(msg, AIMessage) and hasattr(msg, 'tool_calls') and msg.tool_calls:
                
                if msg.content is None or msg.content == "":
                    tool_descriptions = []
                    for tool_call in msg.tool_calls:
                        tool_descriptions.append(f"Called tool '{tool_call['name']}' with args: {tool_call['args']}")
                    new_content = "I need to use tools to help with this request. " + "; ".join(tool_descriptions)
                else:
                    new_content = msg.content
                
                new_msg = AIMessage(
                    content=new_content,
                    tool_calls=msg.tool_calls
                )
                converted.append(new_msg)
            else:
                converted.append(msg)
                
        return converted
    
    def invoke(self, messages, *args, **kwargs):
        if isinstance(messages, list):
            messages = self._convert_messages_for_deimos(messages)
        return super().invoke(messages, *args, **kwargs)
    
    def _generate(self, messages, *args, **kwargs):
        messages = self._convert_messages_for_deimos(messages)
        return super()._generate(messages, *args, **kwargs)
    
    def _call(self, messages, *args, **kwargs):
        messages = self._convert_messages_for_deimos(messages)
        return super()._call(messages, *args, **kwargs)
    
    def generate(self, messages, *args, **kwargs):
        if isinstance(messages[0], list):  # List of message lists
            messages = [self._convert_messages_for_deimos(msg_list) for msg_list in messages]
        return super().generate(messages, *args, **kwargs)