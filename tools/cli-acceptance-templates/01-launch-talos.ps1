# Preserve caller cwd and PATH. Local acceptance only.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$TalosArgs)
$cli = Join-Path $PSScriptRoot 'prefix/node_modules/@pakiknowledge/tal0s-code/cli.js'
if (!(Test-Path -LiteralPath $cli)) { throw "Missing acceptance installation: $cli" }
$names = @('NODE_OPTIONS', 'NODE_PATH', 'MINIMAX_DATA_DIR', 'MAVIS_DATA_DIR', 'TALOS_ENABLE_SHELL_PATH_INTEGRATION')
$saved = @{}
foreach ($name in $names) { $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    $env:NODE_OPTIONS = $null
    $env:NODE_PATH = $null
    $env:TALOS_ENABLE_SHELL_PATH_INTEGRATION = $null
    $env:MINIMAX_DATA_DIR = Join-Path $env:USERPROFILE '.talos'
    $env:MAVIS_DATA_DIR = $env:MINIMAX_DATA_DIR
    $manifest = Get-Content -LiteralPath (Join-Path (Split-Path $cli) 'package.json') -Raw | ConvertFrom-Json
    Write-Host ('[LOCAL CANDIDATE] ' + $manifest.name + ' ' + $manifest.version + ' - NOT PUBLISHED')
    & 'C:\Program Files\nodejs\node.exe' $cli @TalosArgs
    if ($LASTEXITCODE -ne 0) { throw "Talos exited with code $LASTEXITCODE" }
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
}
