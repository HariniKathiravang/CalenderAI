# EEC Calendar Application Setup & LLM Integration Guide

This repository contains the EEC Calendar Management System, featuring a React/Vite frontend and a Python/FastAPI backend with Supabase PostgreSQL connection support.

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
   - [Backend Setup](#1-backend-setup)
   - [Frontend Setup](#2-frontend-setup)
3. [Login Credentials](#login-credentials)
4. [Step-by-Step Guide: Future LLM-based Event Metadata Extraction](#step-by-step-guide-future-llm-based-event-metadata-extraction)
   - [Overview of Placeholders](#1-overview-of-codebase-placeholders)
   - [LLM Model Setup](#2-setting-up-an-llm-model)
   - [LLM Service Implementation](#3-implementing-the-llm-service)
   - [Connecting the Frontend UI](#4-connecting-the-frontend-ui)

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your system:
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)

---

## 🛠️ Local Development Setup

### 1. Backend Setup

Navigate to the `backend/` directory:
```bash
cd backend
```

#### A. Create a Virtual Environment (Recommended)
Create and activate a Python virtual environment to keep dependencies isolated:
```bash
python -m venv venv
```
- **On Windows (PowerShell/CMD):**
  ```bash
  .\venv\Scripts\activate
  ```
- **On macOS/Linux:**
  ```bash
  source venv/bin/activate
  ```

#### B. Install Dependencies
Install all required Python packages (including `pandas` and `openpyxl` for Excel rosters processing):
```bash
pip install -r requirements.txt
```

#### C. Configure Environment Variables
Copy the `.env.example` file to `.env`:
- **On Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```
- **On CMD/Bash/macOS/Linux:**
  ```bash
  cp .env.example .env
  ```

> [!TIP]
> **Database Options:**
> By default, the app is configured to use **Supabase (PostgreSQL)** connection. If you want a quick local setup with zero database installation, you can change the `DATABASE_URL` line inside your new `.env` file to use **SQLite** instead:
> ```env
> DATABASE_URL=sqlite:///./calendar.db
> ```

#### D. Seed the Database
Run the seed script to create all necessary database tables and populate default departments and the default Admin account:
```bash
python seed.py
```

#### E. Run the Backend Server
Start the FastAPI server using Uvicorn:
```bash
uvicorn main:app --reload
```
The backend API will run at **`http://localhost:8000`**. You can view the API documentation at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

Open a new terminal window/tab and navigate to the `frontend/` directory:
```bash
cd frontend
```

#### A. Configure Environment Variables
Copy the `.env.example` file to `.env`:
- **On Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```
- **On CMD/Bash/macOS/Linux:**
  ```bash
  cp .env.example .env
  ```

#### B. Install Dependencies
Install the Node.js packages:
```bash
npm install
```

#### C. Run the Frontend App
Start the Vite development server:
```bash
npm run dev
```
The frontend application will be available at **`http://localhost:5173`**.

---

## 🔑 Login Credentials

Once both servers are running, navigate to **`http://localhost:5173`** and use the seeded administrator credentials:

- **Username:** `admin`
- **Password:** `Admin@123`

---

## 🧠 Step-by-Step Guide: Future LLM-based Event Metadata Extraction

This section outlines how to configure, deploy, and connect the LLM parsing script to the file upload and event extraction placeholders left in the calendar application.

### 1. Overview of Codebase Placeholders

The application has been prepared to accept LLM-extracted event metadata. The placeholders are located in:

#### A. Backend Storage and Controller: `backend/app/services/upload_service.py`
In this service, when a file is uploaded, the standard storage logic saves the file to local disk or Supabase storage. 
```python
# TODO: Connect LLM parser here
# parsed_metadata = await parse_event_from_file(content, file.filename)
# Return parsed title, description, dates when LLM is connected.
```

#### B. LLM Service Placeholder: `backend/app/services/llm_service.py`
This module contains the stub for `parse_event_from_file`, which receives raw bytes (`content: bytes`) and the original `filename`. It is expected to return structured metadata:
```python
async def parse_event_from_file(content: bytes, filename: str) -> dict:
    """
    Extract event metadata from an uploaded file using an LLM.
    Return shape:
    {
        "title": str,
        "description": str | None,
        "event_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD" | None,
        "start_time": "HH:MM" | None,
        "end_time": "HH:MM" | None,
        "venue": str | None,
        "priority": "HIGH" | "MEDIUM" | "STANDARD",
    }
    """
    # TODO: Connect LLM parser here
```

---

### 2. Setting Up an LLM Model (e.g., Gemini API / OpenAI API)

To enable parsing, we recommend using a multimodal LLM like **Gemini 1.5 Flash / Gemini 2.0 Flash** or **GPT-4o**, which can ingest both image circulars and document types (PDFs).

#### Step 1: Install LLM library dependencies
Add the library dependencies to your virtual environment (and to `backend/requirements.txt`):
```bash
# For Gemini
pip install google-genai pydantic

# Or for OpenAI
pip install openai pydantic
```

#### Step 2: Configure Environment Variables
Add your API key to your `backend/.env` file:
```env
# If using Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# If using OpenAI
OPENAI_API_KEY=your_openai_api_key_here
```
Ensure they are registered in the `Settings` class in `backend/app/core/config.py`.

---

### 3. Implementing the LLM Service

Here is a recommended implementation structure for `backend/app/services/llm_service.py` utilizing the Gemini API to extract structured event data.

```python
import os
import json
from pydantic import BaseModel, Field
from typing import Optional
from google import genai
from google.genai import types

# Define the expected schema for the LLM output structure using Pydantic
class EventExtractionSchema(BaseModel):
    title: str = Field(description="Summarized, catchy title of the event")
    description: Optional[str] = Field(description="A clean details description summarizing the circular content")
    event_date: str = Field(description="Start date of the event in YYYY-MM-DD format")
    end_date: Optional[str] = Field(description="End date of the event in YYYY-MM-DD format")
    start_time: Optional[str] = Field(description="Start time in 24hr format HH:MM")
    end_time: Optional[str] = Field(description="End time in 24hr format HH:MM")
    venue: Optional[str] = Field(description="Location or venue of the event")
    priority: str = Field(
        default="STANDARD",
        description="Priority of the event based on importance: HIGH for exams/critical deadlines, MEDIUM for intermediate actions, STANDARD for standard schedules"
    )

async def parse_event_from_file(content: bytes, filename: str) -> dict:
    """
    Extract event metadata from uploaded file bytes using Gemini Structured Outputs.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Fallback to empty values if LLM is not configured
        return {
            "title": filename.rsplit(".", 1)[0],
            "description": None,
            "event_date": None,
            "end_date": None,
            "start_time": None,
            "end_time": None,
            "venue": None,
            "priority": "STANDARD"
        }
    
    # Initialize the client
    client = genai.Client(api_key=api_key)

    # Determine file type / mime type (e.g., image/png, application/pdf)
    ext = filename.rsplit(".", 1)[-1].lower()
    mime_type = "application/octet-stream"
    if ext == "pdf":
        mime_type = "application/pdf"
    elif ext in ("png", "jpg", "jpeg", "webp"):
        mime_type = f"image/{ext if ext != 'jpg' else 'jpeg'}"

    # Prepare document content
    part = types.Part.from_bytes(
        data=content,
        mime_type=mime_type,
    )

    prompt = (
        "You are an expert administrative assistant. Analyze this attached circular/document/image "
        "and extract the event details. Fill in the title, description, dates, times, venue, and "
        "priority. Ensure all date strings conform to YYYY-MM-DD and times to HH:MM."
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=EventExtractionSchema,
                temperature=0.1
            ),
        )
        # Parse the JSON response
        data = json.loads(response.text)
        return data
    except Exception as e:
        print(f"Error parsing with Gemini: {e}")
        # Return base details on failure
        return {
            "title": filename.rsplit(".", 1)[0],
            "description": f"Failed auto-extraction: {e}",
            "event_date": None,
            "end_date": None,
            "start_time": None,
            "end_time": None,
            "venue": None,
            "priority": "STANDARD"
        }
```

---

### 4. Connecting the Frontend UI

Once the LLM service is connected, update the `Add Event` modal in the frontend to listen to the file upload response:
1. When a user uploads a file, trigger a request to a validation endpoint (e.g., `/api/events/parse-metadata`).
2. Populate the form fields (Title, Description, Date, etc.) automatically in the UI from the LLM parsed metadata response.
3. Allow the user to review and correct the fields before clicking `Save Event`.
"# CalenderAI" 
