from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from pdf2image import convert_from_bytes
import cv2
import numpy as np
import ollama
import json
import os
import logging

logger = logging.getLogger(__name__)

app = FastAPI()

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tesseract path from environment or default
TESSERACT_PATH = os.getenv(
    "TESSERACT_PATH",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# Poppler path from environment or None (uses system PATH)
POPPLER_PATH = os.getenv("POPPLER_PATH", None)

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud")


@app.get("/")
def home():
    return {"message": "AI OCR API Running", "model": OLLAMA_MODEL}


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        # Read uploaded PDF
        pdf_bytes = await file.read()

        # Convert PDF -> Images
        pages = convert_from_bytes(
            pdf_bytes,
            poppler_path=POPPLER_PATH
        )

        full_text = ""

        # OCR
        for page in pages:
            img = np.array(page)
            gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            _, thresh = cv2.threshold(
                gray,
                0,
                255,
                cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
            text = pytesseract.image_to_string(
                thresh,
                config="--psm 6"
            )
            full_text += text + "\n"

        # Prompt
        prompt = f"""
You are an AI document parser.

Convert OCR text into structured JSON.

Return ONLY valid JSON.

OCR TEXT:
{full_text}

JSON FORMAT:
{{
    "college_name": "",
    "department": "",
    "date": "",
    "location": "",
    "important_points": []
}}
"""

        # LLM
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        result = response["message"]["content"]
        result = result.replace("```json", "")
        result = result.replace("```", "")
        result = result.strip()

        try:
            structured_data = json.loads(result)
            return {
                "success": True,
                "ocr_text": full_text,
                "structured_output": structured_data
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return {
                "success": False,
                "error": "Invalid JSON returned by model",
                "raw_output": result
            }

    except FileNotFoundError as e:
        logger.error(f"Tesseract or Poppler not found: {e}")
        return {
            "success": False,
            "error": f"Tesseract or Poppler not found. Check TESSERACT_PATH and POPPLER_PATH environment variables."
        }
    except Exception as e:
        logger.error(f"PDF processing failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }
