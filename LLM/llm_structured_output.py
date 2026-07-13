from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from pdf2image import convert_from_bytes
import cv2
import numpy as np
import ollama
import json

app = FastAPI()

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tesseract path
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

POPPLER_PATH = r"C:\Users\Devaprasath\Downloads\Release-26.02.0-0\poppler-26.02.0\Library\bin"


@app.get("/")
def home():
    return {"message": "AI OCR API Running"}


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):

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
        model="gpt-oss:120b-cloud",
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

    except:

        return {
            "success": False,
            "raw_output": result
        }
