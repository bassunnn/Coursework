param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$RootDir = $PSScriptRoot
$ApiProject = Join-Path $RootDir "Warehouse.Api\Warehouse.Api.csproj"
$ClientDir = Join-Path $RootDir "warehouse-client"
$LogsDir = Join-Path $RootDir ".run"
$ApiOutLog = Join-Path $LogsDir "api.out.log"
$ApiErrLog = Join-Path $LogsDir "api.err.log"
$ClientOutLog = Join-Path $LogsDir "client.out.log"
$ClientErrLog = Join-Path $LogsDir "client.err.log"

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

function Get-CommandPath {
    param([string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "Required command '$Name' was not found in PATH."
    }

    return $command.Source
}

function Stop-ProcessTree {
    param([int]$ProcessId)

    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        Stop-ProcessTree -ProcessId $child.ProcessId
    }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-ExistingWarehouseApi {
    $apiExe = Join-Path $RootDir "Warehouse.Api\bin\Debug\net10.0\Warehouse.Api.exe"
    $resolvedApiExe = if (Test-Path $apiExe) { (Resolve-Path -LiteralPath $apiExe).Path } else { $apiExe }

    $processes = Get-CimInstance Win32_Process -Filter "Name = 'Warehouse.Api.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.ExecutablePath -eq $resolvedApiExe }

    foreach ($process in $processes) {
        Write-Host "Stopping existing Warehouse API process $($process.ProcessId)..."
        Stop-ProcessTree -ProcessId $process.ProcessId
    }
}

function Stop-ExistingReactClient {
    $resolvedClientDir = (Resolve-Path -LiteralPath $ClientDir).Path

    $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -and
            $_.CommandLine.Contains($resolvedClientDir) -and
            ($_.CommandLine -like "*vite*" -or $_.CommandLine -like "*warehouse-client*")
        }

    foreach ($process in $processes) {
        if ($process.ProcessId -ne $PID) {
            Write-Host "Stopping existing React client process $($process.ProcessId)..."
            Stop-ProcessTree -ProcessId $process.ProcessId
        }
    }
}

$DotnetCommand = Get-CommandPath "dotnet"
$NpmCommand = Get-CommandPath "npm.cmd"

if (-not $SkipInstall -and -not (Test-Path (Join-Path $ClientDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..."
    npm install --prefix $ClientDir
}

if (-not $SkipInstall) {
    Write-Host "Restoring backend dependencies..."
    dotnet restore $ApiProject
}

Stop-ExistingWarehouseApi
Stop-ExistingReactClient

Write-Host "Starting Warehouse API on http://localhost:5064"
$apiProcess = Start-Process `
    -FilePath $DotnetCommand `
    -ArgumentList @("run", "--project", $ApiProject, "--launch-profile", "http") `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $ApiOutLog `
    -RedirectStandardError $ApiErrLog

Write-Host "Starting React client on http://localhost:5173"
$clientProcess = Start-Process `
    -FilePath $NpmCommand `
    -ArgumentList @("run", "dev", "--", "--host", "0.0.0.0") `
    -WorkingDirectory $ClientDir `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $ClientOutLog `
    -RedirectStandardError $ClientErrLog

try {
    Write-Host ""
    Write-Host "Site is starting:"
    Write-Host "  Client: http://localhost:5173"
    Write-Host "  API:    http://localhost:5064"
    Write-Host ""
    Write-Host "Logs:"
    Write-Host "  API:    $ApiOutLog"
    Write-Host "  API errors:    $ApiErrLog"
    Write-Host "  Client: $ClientOutLog"
    Write-Host "  Client errors: $ClientErrLog"
    Write-Host ""
    Write-Host "Press Ctrl+C to stop everything."

    while (-not $apiProcess.HasExited -and -not $clientProcess.HasExited) {
        Start-Sleep -Seconds 1
        $apiProcess.Refresh()
        $clientProcess.Refresh()
    }

    if ($apiProcess.HasExited) {
        throw "Warehouse API stopped. Check logs: $ApiOutLog and $ApiErrLog"
    }

    if ($clientProcess.HasExited) {
        throw "React client stopped. Check logs: $ClientOutLog and $ClientErrLog"
    }
}
finally {
    foreach ($process in @($apiProcess, $clientProcess)) {
        if ($process -and -not $process.HasExited) {
            Stop-ProcessTree -ProcessId $process.Id
        }
    }
}
