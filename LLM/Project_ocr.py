from pdf2image import convert_from_path
import pytesseract
import cv2
import numpy as np
import requests
import os
import sys
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Tesseract path from environment or default
TESSERACT_PATH = os.getenv(
    "TESSERACT_PATH",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# Poppler path from environment or None (uses system PATH)
POPPLER_PATH = os.getenv("POPPLER_PATH", None)

# LLM service URL from environment or default
LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://127.0.0.1:8001")

# PDF path from environment or command line argument or default
pdf_path = os.getenv("PDF_PATH")
if not pdf_path and len(sys.argv) > 1:
    pdf_path = sys.argv[1]
if not pdf_path:
    pdf_path = "Circular - Deepavali.pdf"

logger.info(f"Using Tesseract: {TESSERACT_PATH}")
logger.info(f"Using Poppler: {POPPLER_PATH or 'system PATH'}")
logger.info(f"Using PDF: {pdf_path}")
logger.info(f"Using LLM service: {LLM_SERVICE_URL}")

if not os.path.exists(pdf_path):
    logger.error(f"PDF file not found: {pdf_path}")
    sys.exit(1)

try:
    # Convert PDF -> Images
    pages = convert_from_path(
        pdf_path,
        poppler_path=POPPLER_PATH
    )

    # Store all extracted text
    full_text = ""

    # OCR Loop
    for i, page in enumerate(pages):
        img = np.array(page)
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        _, thresh = cv2.threshold(
            gray,
            0,
            255,
            cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        text = pytesseract.image_to_string(thresh)
        full_text += text + "\n"

        print(f"\n===== PAGE {i+1} =====\")
        print(text[:200] + "..." if len(text) > 200 else text)

    # Send OCR text to LLM service
    response = requests.post(
        f"{LLM_SERVICE_URL}/generate",
        json={"text": full_text}
    )

    # Final structured output
    print("\n===== STRUCTURED OUTPUT =====\")
    result = response.json()
    print(json.dumps(result, indent=2))

    # Save output
    output_file = "output.json"
    with open(output_file, "w") as f:
        json.dump(result, f, indent=4)
    print(f"\nStructured output saved to {output_file}")

except FileNotFoundError as e:
    logger.error(f"Tesseract or Poppler not found: {e}")
    logger.error(f"Set TESSERACT_PATH and/or POPPLER_PATH environment variables")
    sys.exit(1)
except requests.exceptions.ConnectionError:
    logger.error(f"Cannot connect to LLM service at {LLM_SERVICE_URL}")
    logger.error(f"Make sure the LLM service is running")
    sys.exit(1)
except Exception as e:
    logger.error(f"Error: {e}")
    sys.exit(1)
