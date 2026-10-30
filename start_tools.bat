@echo off
rem RatKnight tools launcher: starts the local server (if not running) and opens the tools in the browser.
rem Double-click this file. Close the "RatKnight server" window to stop the server.
cd /d "%~dp0"
netstat -ano | findstr ":5330" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "RatKnight server" /min node tools\serve.js
  timeout /t 1 /nobreak >nul
)
start "" "http://localhost:5330/web/chartest.html"
start "" "http://localhost:5330/web/mapedit.html"
