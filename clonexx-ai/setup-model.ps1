$ErrorActionPreference = 'Stop'
$ModelName = 'qwen2.5:7b'
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Error 'Ollama is not installed. Install Ollama for Windows from https://ollama.com/download, then run this script again.'
}
Write-Host "Downloading $ModelName to Ollama's local model store. This is several GB and may take a while..."
ollama pull $ModelName
if ($LASTEXITCODE -ne 0) { throw "ollama pull failed with exit code $LASTEXITCODE" }
Write-Host "Model ready. Start Ollama, then run .\start-clonexx.ps1"
