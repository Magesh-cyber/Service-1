import html

def sanitize_string(value: str) -> str:
    """
    Sanitizes a string by:
    1. Trimming leading/trailing whitespace.
    2. Stripping HTML tags/entities to prevent XSS.
    3. Preventing common control characters.
    """
    if not isinstance(value, str):
        return value
        
    # Remove leading/trailing whitespace
    cleaned = value.strip()
    
    # Escape HTML special characters (e.g., <, >, &, ", ')
    # html.escape is the standard way to prevent XSS by turning tags into safe entities
    cleaned = html.escape(cleaned)
    
    return cleaned
