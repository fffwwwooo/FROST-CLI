@echo off
chcp 65001 >nul
title DSH Launcher
cd /d "%~dp0"
node index.js %*
if %errorlevel% neq 0 pause
