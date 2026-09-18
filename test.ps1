# Run every BOLI check.
#
#   .\test.ps1          # everything, including the checks that load models,
#                       # call the LLM and synthesise audio (a few minutes)
#   .\test.ps1 -Quick   # only checks that need no models or network
#
# Exits non-zero if anything fails, and names what failed.
param([switch]$Quick)

$root = $PSScriptRoot
$python = Join-Path $root "backend\.venv\Scripts\python.exe"
$failed = @()

# Fast: no model weights, no LLM, no audio synthesis.
$backendQuick = @(
    "test_translation_guard.py",   # repetition-loop detection
    "test_corrections.py",         # lessons + corrections, temp database
    "test_errors.py",              # 500s keep CORS; /health readiness
    "test_chapter_asr.py"          # sentence splitting, grade prompts
)
# Slow: load models, synthesise audio, call the simplifier or Tesseract.
$backendFull = @(
    "test_phrase_bank.py",         # the scope boundary, every bank voice
    "test_chapter_pdf.py",         # garbled PDF recovered by OCR
    "test_contrast.py",            # the P0 contrast (IndicTrans2)
    "test_ocr_pedagogy.py"         # OCR + live LLM simplification
)
$backendTests = if ($Quick) { $backendQuick } else { $backendQuick + $backendFull }

Push-Location (Join-Path $root "backend")
foreach ($t in $backendTests) {
    Write-Host "== backend: $t"
    & $python $t 2>&1 | Where-Object { $_ -notmatch "Warning|warnings.warn" } | Select-Object -Last 3
    if ($LASTEXITCODE -ne 0) { $failed += "backend/$t" }
}
Pop-Location

Push-Location (Join-Path $root "frontend")
Write-Host "== frontend: lint"
npm run lint --silent
if ($LASTEXITCODE -ne 0) { $failed += "frontend lint" }
Write-Host "== frontend: tests"
npm test --silent 2>&1 | Select-String -Pattern "^. (pass|fail)|not ok"
if ($LASTEXITCODE -ne 0) { $failed += "frontend tests" }
Write-Host "== frontend: build"
npm run build --silent 2>&1 | Select-Object -Last 1
if ($LASTEXITCODE -ne 0) { $failed += "frontend build" }
Pop-Location

if ($failed.Count) {
    Write-Host "`nFAILED: $($failed -join ', ')" -ForegroundColor Red
    exit 1
}
Write-Host "`nALL CHECKS PASSED" -ForegroundColor Green
