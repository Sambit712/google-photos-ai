# Google Photos AI: Semantic Memory Discovery & Timeline Engine

An intelligent, multi-tier semantic memory discovery and timeline visualization system modeled after Google Photos. Powered by Groq LPU inference, spatio-temporal clustering, and a high-performance 3-tiered virtualized memory stream.

![Google Photos UI](docs/architecture.png)

---

## ✨ Features

- **Conversational Memory Search**: Natural language memory queries (e.g. *"those photos from Goa when we went to a café with friends in the evening"*) parsed into structured slot matrices (Place, Activity, People, Temporal constraints).
- **Ultra-Fast Inference**: Groq LPU accelerated extraction with dual-tier fallback (`llama-3.3-70b-versatile` & `llama-3.1-8b-instant`).
- **Hybrid Vector Retrieval**: Combined dense semantic vector search + deterministic spatio-temporal filtering.
- **Three-Tier Virtualized Photo Stream**:
  - **Viewport (Blue)**: Active high-resolution 4K/HDR keyframes decoded eagerly on the GPU.
  - **Preload (Pink)**: Pre-fetched adjacent memories in idle background threads.
  - **Low res (Orange)**: Pixelated blurhash geometry preserving 60fps infinite scrolling without memory exhaustion.
- **Chrome Mockup & Architectural Brackets**: Visual layout inspired by Google Photos virtual streaming architecture.
- **Spatio-Temporal Episode Clustering**: Auto-synthesizes continuous photo streams into coherent episodes and multi-day trips.
- **Interactive Lightbox & Context Envelope**: Seamless inspection of keyframe candidates, metadata tags, and surrounding moments.
- **Privacy & Audit Engine**: Built-in PII redaction and differential privacy auditing.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Inference**: Groq SDK (`groq-sdk`)
- **Validation**: Zod schema validation
- **Testing**: Vitest (36 unit & integration tests)
- **Frontend**: Vanilla HTML5, CSS3 (Material Design 3 & Google Photos design system), Vanilla JavaScript (ES Modules)

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (>= 18.x)
- A Groq Cloud API Key ([https://console.groq.com/](https://console.groq.com/))

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Sambit712/google-photos-ai.git
cd google-photos-ai

# Install dependencies
npm install
```

### 3. Environment Setup
Copy the template and add your Groq API key:
```bash
cp .env.example .env
```
Edit `.env`:
```ini
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_PRIMARY_MODEL=llama-3.3-70b-versatile
GROQ_FALLBACK_MODEL=llama-3.1-8b-instant
```

### 4. Build and Run
```bash
# Compile TypeScript
npm run build

# Start the server
npm start
```
Open your browser at **`http://localhost:3001`**.

---

## 🧪 Testing

Run the test suite:
```bash
npm test
```
All 36 unit and integration test suites will execute across clustering, intent parsing, API endpoints, and privacy auditing.

---

## 📄 License
MIT
