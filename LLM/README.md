# LLM OCR Service Setup

This directory contains the OCR + LLM microservices for parsing event documents.

## Components

### 1. `llm_structured_output.py`
FastAPI server that takes **PDF file uploads** and returns structured JSON.

**Endpoint**: `POST /upload-pdf`

### 2. `llm_structured_op.py`
FastAPI server that takes **raw OCR text** and returns structured JSON.

**Endpoint**: `POST /generate`

### 3. `Project_ocr.py`
Standalone Python script for batch processing PDFs from the command line.

---

## Environment Variables

Configure these before running the services:

```bash
# Tesseract OCR path (Windows default shown)
set TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe

# Poppler path (optional - if not in system PATH)
set POPPLER_PATH=C:\path\to\poppler\bin

# Ollama model to use
set OLLAMA_MODEL=gpt-oss:120b-cloud

# For Project_ocr.py: PDF file path
set PDF_PATH=C:\path\to\document.pdf

# For Project_ocr.py: LLM service URL
set LLM_SERVICE_URL=http://127.0.0.1:8001
```

### Linux/Mac
```bash
export TESSERACT_PATH=/usr/bin/tesseract
export POPPLER_PATH=/usr/bin
export OLLAMA_MODEL=gpt-oss:120b-cloud
export PDF_PATH=./Circular - Deepavali.pdf
export LLM_SERVICE_URL=http://127.0.0.1:8001
```

---

## Installation

### 1. Install System Dependencies

**Windows (Chocolatey)**:
```powershell
choco install tesseract
choco install poppler
```

**Ubuntu/Debian**:
```bash
sudo apt-get install tesseract-ocr poppler-utils
```

**macOS**:
```bash
brew install tesseract
brew install poppler
```

### 2. Install Python Packages

```bash
pip install -r requirements.txt
```

Or manually:
```bash
pip install fastapi uvicorn pytesseract pdf2image opencv-python ollama numpy
```

### 3. Ensure Ollama is Running

```bash
# Start Ollama service
ollama serve

# In another terminal, pull the model
ollama pull gpt-oss:120b-cloud
```

---

## Running the Services

### Option 1: Full Pipeline (Recommended for Development)

1. **Start LLM Text Parser**:
```bash
cd LLM
uvicorn llm_structured_op:app --host 127.0.0.1 --port 8001
# Endpoint: http://127.0.0.1:8001/generate (text → JSON)
```

2. **Start Backend API**:
```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
# Endpoint: http://127.0.0.1:8000/api/events/upload (file upload)
```

3. **Frontend connects to backend**, backend calls LLM service

### Option 2: Batch Process PDFs

Process a single PDF or directory:

```bash
# Process specific PDF
python Project_ocr.py "C:\path\to\document.pdf"

# Use environment variable
set PDF_PATH=Circular - Deepavali.pdf
python Project_ocr.py

# Output saved to output.json
```

---

## Error Troubleshooting

### "Tesseract not found"
- Verify installation: `tesseract --version`
- Set correct path: `set TESSERACT_PATH=...`
- Add to system PATH instead

### "Cannot find Poppler"
- Install Poppler (see above)
- Or set `POPPLER_PATH` environment variable
- Verify: `pdfinfo --version`

### "Cannot connect to Ollama"
- Ensure Ollama service is running: `ollama serve`
- Check port 11434 is open
- Try: `curl http://localhost:11434/api/version`

### "Model not found"
- List available models: `ollama list`
- Pull model: `ollama pull gpt-oss:120b-cloud`
- Or use lighter model: `ollama pull mistral`

### "LLM returns invalid JSON"
- Try different model (e.g., `llama2` instead of `gpt-oss:120b-cloud`)
- Check OCR text quality
- Increase model context size if available

---

## API Examples

### Upload PDF (via backend)
```bash
curl -X POST -F "file=@document.pdf" \
  http://localhost:8000/api/events/upload \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Parse Text (via LLM service directly)
```bash
curl -X POST http://localhost:8001/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Annual Hackathon on August 15, 2026 at Main Auditorium"
  }'
```

### Response Format
```json
{
  "success": true,
  "data": {
    "title": "Annual Hackathon",
    "description": "Event details extracted from document",
    "event_date": "2026-08-15",
    "end_date": null,
    "start_time": null,
    "end_time": null,
    "venue": "Main Auditorium",
    "priority": "HIGH"
  }
}
```

---

## Performance Tuning

### Faster Models
Instead of `gpt-oss:120b-cloud` (slow, accurate):
- Use `mistral` (7B, very fast, good quality)
- Use `neural-chat` (7B, balanced)
- Use `llama2` (7B-70B, flexible)

Example:
```bash
set OLLAMA_MODEL=mistral
ollama pull mistral
```

### Reduce Image Processing Time
- Pre-process PDFs to remove noise before uploading
- Use lower resolution images if accuracy is acceptable
- Batch process multiple pages in parallel

### Increase Concurrent Requests
Use Gunicorn for production:
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker llm_structured_op:app
```

---

## Production Deployment

### Docker
```dockerfile
FROM python:3.11
RUN apt-get update && apt-get install -y tesseract-ocr poppler-utils
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "llm_structured_op:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Environment Variables (Production)
Use `.env` file or container secrets:
```
TESSERACT_PATH=/usr/bin/tesseract
POPPLER_PATH=/usr/bin
OLLAMA_MODEL=mistral
OLLAMA_HOST=http://ollama-service:11434
```

### Scaling
- Run LLM service on GPU-enabled machine (RunPod, Lambda Labs)
- Use load balancer for multiple instances
- Add request queue (RabbitMQ, Redis) for heavy loads

---

## Files Overview

| File | Purpose | Type |
|------|---------|------|
| `llm_structured_output.py` | PDF upload → OCR → JSON | FastAPI Server |
| `llm_structured_op.py` | Text → JSON parser | FastAPI Server |
| `Project_ocr.py` | Batch PDF processor | CLI Script |
| `requirements.txt` | Python dependencies | Config |
| `output.json` | LLM output sample | Data |

---

## Integration with Backend

Backend calls LLM service when:
1. User uploads document to `/api/events/upload`
2. Backend extracts file bytes
3. Backend calls `parse_event_from_file()` (in `backend/app/services/llm_service.py`)
4. LLM service returns parsed metadata
5. Metadata returned in response with `parsed_metadata` field

---

## Environment Configuration Checklist

- [ ] Tesseract installed and path set
- [ ] Poppler installed (if on Windows)
- [ ] Ollama running with model pulled
- [ ] Python dependencies installed
- [ ] Environment variables configured
- [ ] Backend and LLM services tested
- [ ] Frontend can upload files
- [ ] Parsed metadata appears in response
