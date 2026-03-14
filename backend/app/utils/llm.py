import os
from typing import List
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings

def get_available_gemini_keys() -> List[str]:
    """
    Reads GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc. from env.
    Returns a list of all non-empty keys found.
    """
    keys = []
    
    # Check the primary key from config
    if settings.GEMINI_API_KEY:
        keys.append(settings.GEMINI_API_KEY)
        
    # Check for supplementary keys directly from os.environ
    i = 1
    while True:
        key_name = f"GEMINI_API_KEY_{i}"
        key_value = os.environ.get(key_name, "").strip()
        if key_value:
            if key_value not in keys:
                keys.append(key_value)
            i += 1
        else:
            # If we don't find the next consecutive key, we stop searching
            break
            
    return keys

# State for tracking which key we are on
_current_key_index = 0

def get_gemini_llm(model: str = None, temperature: float = 0.3) -> ChatGoogleGenerativeAI:
    """
    Returns a ChatGoogleGenerativeAI instance using the current active key.
    """
    global _current_key_index
    keys = get_available_gemini_keys()
    
    if not keys:
        raise ValueError("No GEMINI_API_KEY found in environment variables.")
        
    # Ensure index is in bounds (in case keys changed)
    _current_key_index = _current_key_index % len(keys)
    active_key = keys[_current_key_index]
    
    return ChatGoogleGenerativeAI(
        model=model or settings.LLM_MODEL,
        api_key=active_key,
        temperature=temperature
    )

def rotate_gemini_key():
    """
    Rotates to the next available API key. Called when a rate limit is hit.
    """
    global _current_key_index
    keys = get_available_gemini_keys()
    if keys:
        old_index = _current_key_index
        _current_key_index = (_current_key_index + 1) % len(keys)
        print(f"[LLM] Rotated API Key from index {old_index} to {_current_key_index}")
    else:
        print("[LLM] Cannot rotate; no API keys available.")

async def call_llm_with_retry(messages: list, temperature: float = 0.3, max_retries: int = 3):
    """
    Helper function to call the LLM and automatically rotate the key if a 429 quota/rate limit error is hit.
    """
    import asyncio
    keys = get_available_gemini_keys()
    # Cap retries to the number of available keys + 1 just in case
    retries = min(max_retries, len(keys)) if keys else max_retries

    for attempt in range(retries):
        try:
            llm = get_gemini_llm(temperature=temperature)
            return await llm.ainvoke(messages)
        except Exception as e:
            err_str = str(e).lower()
            # If it's a 429 Resource Exhausted error, rotate key and try again
            if "429" in err_str or "quota" in err_str or "exhausted" in err_str:
                print(f"[LLM] Hit rate limit/quota on attempt {attempt + 1}. Rotating key...")
                rotate_gemini_key()
                # small backoff
                await asyncio.sleep(1)
            else:
                # If it's another error, raise it normally
                raise e
                
    # If all retries exhausted, raise an exception
    raise Exception(f"Failed to get LLM response after {retries} attempts due to rate limits.")
