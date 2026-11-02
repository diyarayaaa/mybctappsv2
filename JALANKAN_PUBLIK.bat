@echo off
title MyBCTApps v2 - Server & Cloudflare Public Tunnel
color 0A
echo ==========================================================
echo   MENJALANKAN MYBCTAPPS V2 + CLOUDFLARE QUICK TUNNEL
echo ==========================================================
echo.

set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%LOCALAPPDATA%\Programs\cloudflared;%PATH%"

echo [1/2] Menjalankan Server Aplikasi di port 2525...
start "MyBCTApps v2 Server (Port 2525)" cmd /k "set PATH=C:\Program Files\nodejs;%PATH% && npm.cmd run dev"

timeout /t 4 /nobreak >nul

echo [2/2] Membuka Link Publik Cloudflare Tunnel...
echo Salin link https://xxxx.trycloudflare.com yang muncul di bawah ini:
echo.
"%LOCALAPPDATA%\Programs\cloudflared\cloudflared.exe" tunnel --url http://localhost:2525
pause

