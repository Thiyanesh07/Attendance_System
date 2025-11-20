# Activate conda environment
conda activate face

# Add cuDNN to PATH
$pythonPath = python -c "import sys; print(sys.executable)"
$pythonDir = Split-Path $pythonPath
$cudnnPath = Join-Path $pythonDir "Lib\site-packages\nvidia\cudnn\bin"
$cublasPath = Join-Path $pythonDir "Lib\site-packages\nvidia\cublas\bin"

if (Test-Path $cudnnPath) {
    $env:PATH = "$cudnnPath;$cublasPath;$env:PATH"
    Write-Host "✓ Added cuDNN to PATH: $cudnnPath"
} else {
    Write-Host "⚠ cuDNN path not found at: $cudnnPath"
}

# Start the server
Write-Host "Starting backend server with GPU support..."
cd $PSScriptRoot
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
