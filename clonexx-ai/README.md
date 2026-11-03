# Clonexx AI (local)

Clonexx AI runs chat inference through Ollama on this computer and stores chat history in `clonexx.sqlite3` beside the server. It does not send prompts to a hosted AI API.

## Setup

1. Install Ollama for Windows and ensure it is running.
2. In PowerShell, from this folder, run `.setup-model.ps1` to download Qwen 2.5 7B (quantized; several GB).
3. Run `.start-clonexx.ps1` and leave that window open.
4. Open `clonexx-(chat).html` in a browser and sign in as usual if your existing page requires it.

The server listens only on `127.0.0.1:8000`. The model is a pretrained general assistant, not a newly trained foundation model. Clonexx supplies recent conversation context at inference time; chat transcripts persist in SQLite.
