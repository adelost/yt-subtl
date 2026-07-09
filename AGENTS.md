# AGENTS.md - yt-subtl

This repository is edited in WSL, but Mattias uses the unpacked Chrome extension from a Windows-local copy.

## Chrome Dev Extension Sync

The permanent unpacked extension path in normal Windows Chrome is:

```text
C:\Users\adelo\AppData\Local\yt-subtl-dev\dist
```

Do not ask Mattias to load the WSL path. Chrome on Windows should load the Windows-local copy above.

After any extension code or build-output change, run:

```powershell
C:\Users\adelo\Desktop\Update YouTube Transcript Reader Dev.bat
```

or from the repo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "\\wsl.localhost\Ubuntu-22.04\home\adelost\lsrc\yt-subtl\scripts\sync-dev-extension.ps1"
```

The script runs `npm run build` in WSL, copies `dist/` into the Windows dev folder, and opens `chrome://extensions/` so the unpacked extension can be reloaded.

If Chrome still shows old behavior, click Reload on the unpacked extension card in `chrome://extensions/`.
