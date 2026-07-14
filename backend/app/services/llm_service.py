"""LLM-based event metadata extraction from uploaded files using Tesseract OCR and Ollama."""

import io
import json
import logging
from typing import Optional, Dict, Any
import os

try:
    import pytesseract
    from pdf2image import convert_from_bytes
    import cv2
    import numpy as np
    import ollama
except ImportError as e:
    logging.warning(f"OCR/LLM dependencies not installed: {e}. Using mock mode.")
    pytesseract = None
    convert_from_bytes = None
    cv2 = None
    np = None
    ollama = None

from datetime import datetime

logger = logging.getLogger(__name__)

# Configure Tesseract path (from environment or default)
TESSERACT_PATH = os.getenv("TESSERACT_PATH", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if pytesseract:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")


def _extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF using Tesseract OCR."""
    if not pytesseract or not convert_from_bytes or not cv2 or not np:
        logger.warning("OCR dependencies not available, returning empty text")
        return ""
    
    try:
        pages = convert_from_bytes(content)
        full_text = ""
        
        for page in pages:
            img = np.array(page)
            gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            text = pytesseract.image_to_string(thresh, config="--psm 6")
            full_text += text + "\n"
        
        return full_text
    except Exception as e:
        logger.error(f"PDF OCR extraction failed: {e}")
        return ""


def _extract_text_from_image(content: bytes) -> str:
    """Extract text from image using Tesseract OCR."""
    if not pytesseract or not cv2 or not np:
        logger.warning("OCR dependencies not available, returning empty text")
        return ""
    
    try:
        nparr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        text = pytesseract.image_to_string(thresh, config="--psm 6")
        
        return text
    except Exception as e:
        logger.error(f"Image OCR extraction failed: {e}")
        return ""


def _extract_text_from_file(content: bytes, filename: str) -> str:
    """Route to appropriate OCR method based on file type."""
    ext = filename.rsplit(".", 1)[-1].lower() if filename else ""
    
    if ext == "pdf":
        return _extract_text_from_pdf(content)
    elif ext in ("png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff"):
        return _extract_text_from_image(content)
    else:
        logger.warning(f"Unsupported file type for OCR: {ext}")
        return ""


def _parse_with_llm(extracted_text: str) -> Dict[str, Any]:
    """Send extracted text to Ollama for structured parsing."""
    if not ollama:
        logger.warning("Ollama not available, returning empty dict")
        return {}
    
    if not extracted_text or extracted_text.strip() == "":
        logger.warning("No text extracted from file")
        return {}
    
    prompt = f"""You are an AI document parser for educational events.

Your task is to extract event information from OCR text and return ONLY valid JSON.

IMPORTANT RULES:
1. Return ONLY valid JSON
2. Do not add explanations or markdown
3. Do not include ```json or similar formatting
4. If a field is missing, return empty string or null
5. Date format: YYYY-MM-DD
6. Time format: HH:MM (24-hour)
7. Priority must be one of: HIGH, MEDIUM, STANDARD
8. Title should be concise (max 255 chars)

OCR TEXT:
{extracted_text}

EXPECTED JSON FORMAT:
{{
    "title": "Event Name",
    "description": "Event details and description",
    "event_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD or null",
    "start_time": "HH:MM or null",
    "end_time": "HH:MM or null",
    "venue": "Location or null",
    "priority": "HIGH or MEDIUM or STANDARD"
}}
"""
    
    try:
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            stream=False
        )
        
        result = response["message"]["content"]
        result = result.replace("```json", "").replace("```", "").strip()
        
        parsed = json.loads(result)
        return parsed
        
    except json.JSONDecodeError as e:
        logger.error(f"LLM returned invalid JSON: {e}")
        return {}
    except Exception as e:
        logger.error(f"LLM parsing failed: {e}")
        return {}


async def parse_event_from_file(content: bytes, filename: str) -> dict:
    """
    Extract event metadata from an uploaded file using Tesseract OCR and Ollama LLM.
    
    Args:
        content: File bytes
        filename: Original filename (used to determine file type)
    
    Returns:
        Dict with event fields: title, description, event_date, end_date, 
        start_time, end_time, venue, priority
    """
    # Step 1: Extract text from file using Tesseract
    extracted_text = _extract_text_from_file(content, filename)
    
    # Step 2: Parse extracted text with LLM
    parsed_data = _parse_with_llm(extracted_text)
    
    # Step 3: Apply defaults and validation
    result = {
        "title": parsed_data.get("title", filename.rsplit(".", 1)[0] if filename else "Event"),
        "description": parsed_data.get("description", ""),
        "event_date": parsed_data.get("event_date", datetime.now().date().isoformat()),
        "end_date": parsed_data.get("end_date"),
        "start_time": parsed_data.get("start_time"),
        "end_time": parsed_data.get("end_time"),
        "venue": parsed_data.get("venue"),
        "priority": parsed_data.get("priority", "STANDARD"),
    }
    
    # Validate priority
    if result["priority"] not in ("HIGH", "MEDIUM", "STANDARD"):
        result["priority"] = "STANDARD"
    
    # Truncate title if too long
    if len(result["title"]) > 255:
        result["title"] = result["title"][:255]
    
    return result
