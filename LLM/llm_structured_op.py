from fastapi import FastAPI
from pydantic import BaseModel
import ollama
import json
import logging
import os

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI()

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud")


# Request body model
class PromptRequest(BaseModel):
    text: str


@app.get("/")
def home():
    return {
        "message": "OCR to Structured JSON API is running",
        "model": OLLAMA_MODEL
    }


@app.post("/generate")
def generate(request: PromptRequest):

    # OCR extracted text
    raw_text = request.text

    # Prompt for LLM
    prompt = f"""
You are an AI document parser.

Your task is to convert OCR extracted text
into clean structured JSON.

IMPORTANT RULES:
1. Return ONLY valid JSON
2. Do not add explanations
3. Do not add markdown
4. Do not add ```json
5. If data is missing, return empty string
6. Keep output clean and structured

OCR TEXT:
{raw_text}

EXPECTED JSON FORMAT:
{{
    "college_name": "",
    "department": "",
    "date": "",
    "location": "",
    "important_points": []
}}
"""

    try:

        # Send prompt to Ollama
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # Extract model response
        result = response["message"]["content"]

        # Clean markdown if present
        result = result.replace("```json", "")
        result = result.replace("```", "")
        result = result.strip()

        # Convert string -> JSON
        structured_data = json.loads(result)

        # Return success response
        return {
            "success": True,
            "data": structured_data
        }

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return {
            "success": False,
            "error": "Invalid JSON returned by model",
            "raw_output": result
        }

    except Exception as e:
        logger.error(f"LLM processing failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }
