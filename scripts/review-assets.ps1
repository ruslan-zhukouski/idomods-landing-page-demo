param([switch]$EncodeWebp)
$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$chromePath = Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'
if (-not (Test-Path -LiteralPath $chromePath)) { throw 'Chrome is required for the Windows asset review.' }
$profilePath = Join-Path ([System.IO.Path]::GetTempPath()) ('idomods-assets-' + [guid]::NewGuid().ToString('N'))
$pagePath = if ($EncodeWebp) { 'scripts/encode-webp.html' } else { 'docs/asset-review.html' }
$outputPath = Join-Path $repoRoot $(if ($EncodeWebp) { 'docs/references/.webp-output.html' } else { 'docs/references/.review-dom.html' })
$errorPath = Join-Path $profilePath 'chrome-errors.txt'
[System.IO.Directory]::CreateDirectory($profilePath) | Out-Null
$pageUrl = ([uri](Join-Path $repoRoot $pagePath)).AbsoluteUri
$chromeArguments = @('--headless','--disable-gpu','--no-first-run','--no-default-browser-check',('"--user-data-dir=' + $profilePath + '"'),'--allow-file-access-from-files','--virtual-time-budget=20000','--window-size=1440,2800')
if (-not $EncodeWebp) { $chromeArguments += ('"--screenshot=' + (Join-Path $repoRoot 'docs/references/asset-review-desktop.png') + '"') }
$chromeArguments += @('--dump-dom',('"' + $pageUrl + '"'))
$browserProcess = Start-Process -FilePath $chromePath -ArgumentList $chromeArguments -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput $outputPath -RedirectStandardError $errorPath
if ($browserProcess.ExitCode -ne 0) { throw "Chrome failed; inspect $errorPath" }
Push-Location $repoRoot
try {
    if ($EncodeWebp) {
        & node scripts/save-webp.mjs
        if ($LASTEXITCODE -ne 0) { throw 'WebP save failed' }
    } else {
        $dom = Get-Content -Raw -LiteralPath $outputPath
        $resultMatch = [regex]::Match($dom,'<output id="review-status">([^<]+)</output>')
        if (-not $resultMatch.Success) { throw 'Missing browser asset report' }
        $report = [System.Net.WebUtility]::HtmlDecode($resultMatch.Groups[1].Value) | ConvertFrom-Json
        if ($dom -notmatch 'data-review="passed"' -or $report.broken.Count -gt 0) { throw 'Browser asset review failed' }
        $report | Add-Member -NotePropertyName browser -NotePropertyValue 'Chrome headless (installed version)'
        $report | Add-Member -NotePropertyName checkedOn -NotePropertyValue '2026-11-05'
        $report | Add-Member -NotePropertyName viewport -NotePropertyValue '1440x2800'
        $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath 'docs/browser-asset-validation.json' -Encoding utf8
        $report | ConvertTo-Json -Depth 6
    }
    Remove-Item -LiteralPath $outputPath
} finally { Pop-Location }
