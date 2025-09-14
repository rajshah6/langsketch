from deimos_router import Router, register_router, chat
from deimos_router.rules import TaskRule, CodeRule, MessageLengthRule, AutoTaskRule

def setup_intelligent_router():
    """Create and register an intelligent routing system"""
    
    print("Setting up Deimos router...")

    TaskRule(
        name="agent-task-routing",
        triggers={
            'coding': 'anthropic/claude-3-5-sonnet-20241022',
            'analysis': 'anthropic/claude-3-5-sonnet-20241022', 
            'creative': 'openai/gpt-4o',
            'simple': 'openai/gpt-4o-mini',
            'reasoning': 'anthropic/claude-3-5-sonnet-20241022'
        }
    )

    CodeRule(
        name="agent-code-detection", 
        code='anthropic/claude-3-5-sonnet-20241022',
        not_code='deimos/rules/agent-message-length' 
    )
    
    MessageLengthRule(
        name="agent-message-length",
        short_threshold=50,
        long_threshold=1000,
        short_model='openai/gpt-4o-mini',
        medium_model='openai/gpt-4o', 
        long_model='anthropic/claude-3-5-sonnet-20241022'
    )
    
    AutoTaskRule(
        name="agent-auto-fallback",
        triggers={
            "writing code": 'anthropic/claude-3-5-sonnet-20241022',
            "data analysis": 'anthropic/claude-3-5-sonnet-20241022',
            "creative writing": 'openai/gpt-4o',
            "simple questions": 'openai/gpt-4o-mini',
            "complex reasoning": 'anthropic/claude-3-5-sonnet-20241022',
            "research": 'anthropic/claude-3-5-sonnet-20241022'
        }
    )
    
    router = Router(
        name="agent-intelligence-router",
        rules=[
            "deimos/rules/agent-task-routing",     
            "deimos/rules/agent-code-detection",     
            "deimos/rules/agent-message-length",   
            "deimos/rules/agent-auto-fallback"    
        ],
        default='openai/gpt-4o'  
    )
    
    register_router(router)
    print("Router 'agent-intelligence-router' registered successfully!")
    
    return "deimos/agent-intelligence-router"
