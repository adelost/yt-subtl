$ErrorActionPreference = "Stop"

$distro = if ($env:YT_SUBTL_WSL_DISTRO) { $env:YT_SUBTL_WSL_DISTRO } else { "Ubuntu-22.04" }
$repoLinux = if ($env:YT_SUBTL_WSL_REPO) { $env:YT_SUBTL_WSL_REPO } else { "/home/adelost/lsrc/yt-subtl" }
$target = if ($env:YT_SUBTL_DEV_DIST) { $env:YT_SUBTL_DEV_DIST } else { "Q:\yt-subtl-dev\dist" }
$chrome = if ($env:YT_SUBTL_CHROME) { $env:YT_SUBTL_CHROME } else { "C:\Program Files\Google\Chrome\Application\chrome.exe" }

Write-Host "Building yt-subtl in WSL ($distro): $repoLinux"
& wsl.exe -d $distro --cd $repoLinux -- bash -lc "npm run build"
if ($LASTEXITCODE -ne 0) {
    throw "npm run build failed in WSL."
}

$distWin = (& wsl.exe -d $distro --cd $repoLinux -- wslpath -w "$repoLinux/dist").Trim()
if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $distWin "manifest.json"))) {
    throw "Could not resolve built dist directory from WSL: $repoLinux/dist"
}

Write-Host "Syncing built extension to: $target"
New-Item -ItemType Directory -Force -Path $target | Out-Null
Get-ChildItem -Force -Path $target | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $distWin "*") -Destination $target -Recurse -Force

if (-not (Test-Path (Join-Path $target "manifest.json"))) {
    throw "Sync failed: manifest.json missing from $target"
}

Write-Host ""
Write-Host "Done. Chrome dev extension files are updated."
Write-Host "If the unpacked extension is already loaded, click Reload for it on chrome://extensions/."

if (Test-Path $chrome) {
    Start-Process -FilePath $chrome -ArgumentList "chrome://extensions/"
}
