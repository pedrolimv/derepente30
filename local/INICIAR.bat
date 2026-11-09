@echo off
chcp 65001 >nul
title De repente 30 - Votacao local
cd /d "%~dp0.."
where node >nul 2>nul || (echo. & echo   Node.js nao encontrado. Instale em https://nodejs.org e tente de novo. & echo. & pause & exit /b 1)
node local\servidor.js
echo.
echo   O servidor parou.
pause
