from deimos_router import Router, register_router
from deimos_router.rules import  CodeRule, MessageLengthRule, AutoTaskRule

def setup_intelligent_router():
    """Create and register intelligent routing system"""

    # Primary auto-task detection for specialized models
    AutoTaskRule(
        name="agent-specialist-detection",
        triggers={
            "solidity_coding": 'alfredpros/codellama-7b-instruct-solidity',
            "mathematical_proof": 'deepseek/deepseek-prover-v2', 
            "math_reasoning": 'qwen/qwq-32b',
            "step_by_step_reasoning": 'deepseek/deepseek-r1',
            "visual_analysis": 'qwen/qwen2.5-vl-72b-instruct',
            "web_research": 'perplexity/sonar-reasoning',
            "current_events": 'perplexity/sonar'
        },
        llm_model='openai/gpt-4o-mini'  
    )

    # General programming and analysis tasks
    AutoTaskRule(
        name="agent-general-tasks",
        triggers={
            "coding": 'anthropic/claude-3-5-sonnet-20241022',
            "debugging": 'anthropic/claude-3-5-sonnet-20241022',
            "code_review": 'anthropic/claude-3-5-sonnet-20241022',
            "data_analysis": 'anthropic/claude-3-5-sonnet-20241022',
            "system_design": 'anthropic/claude-3-5-sonnet-20241022',
            "technical_writing": 'anthropic/claude-3-5-sonnet-20241022'
        },
        llm_model='openai/gpt-4o-mini'
    )

    # Creative and communication tasks
    AutoTaskRule(
        name="agent-creative-tasks",
        triggers={
            "creative_writing": 'openai/gpt-4o',
            "storytelling": 'openai/gpt-4o', 
            "content_creation": 'openai/gpt-4o',
            "marketing_copy": 'openai/gpt-4o',
            "brainstorming": 'openai/gpt-4o-mini'
        },
        llm_model='openai/gpt-4o-mini'
    )

    # Simple tasks for cost optimization
    AutoTaskRule(
        name="agent-simple-tasks",
        triggers={
            "simple_question": 'openai/gpt-4o-mini',
            "quick_answer": 'openai/gpt-4o-mini',
            "translation": 'openai/gpt-4o-mini',
            "summarization": 'openai/gpt-4o-mini',
            "basic_explanation": 'openai/gpt-4o-mini'
        },
        llm_model='openai/gpt-4o-mini'
    )

    # Fallback based on complexity detection
    AutoTaskRule(
        name="agent-complexity-routing",
        triggers={
            "complex_analysis": 'anthropic/claude-3-5-sonnet-20241022',
            "detailed_research": 'anthropic/claude-3-5-sonnet-20241022', 
            "comprehensive_review": 'anthropic/claude-3-5-sonnet-20241022',
            "general_help": 'openai/gpt-4o',
            "casual_conversation": 'openai/gpt-4o-mini'
        },
        default='openai/gpt-4o', 
        llm_model='openai/gpt-4o-mini'
    )

    # Direct code detection rule for immediate routing
    CodeRule(
        name="agent-code-detection", 
        code='anthropic/claude-3-5-sonnet-20241022',
        not_code='deimos/rules/agent-specialist-detection' 
    )
    
    # Smart length-based routing
    MessageLengthRule(
        name="agent-smart-length",
        short_threshold=50,    
        long_threshold=800, 
        short_model='openai/gpt-4o-mini',
        medium_model='openai/gpt-4o', 
        long_model='anthropic/claude-3-5-sonnet-20241022'
    )
    
    router = Router(
        name="agent-router",
        rules=[
            "deimos/rules/agent-code-detection",       
            "deimos/rules/agent-specialist-detection",  
            "deimos/rules/agent-general-tasks",       
            "deimos/rules/agent-creative-tasks",    
            "deimos/rules/agent-simple-tasks",        
            "deimos/rules/agent-smart-length",         
            "deimos/rules/agent-complexity-routing"   
        ],
        default='openai/gpt-4o'
    )
    
    register_router(router)
    
    return "agent-router"