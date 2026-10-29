@echo off
chcp 65001 >nul
title Antigravity CLI 1.4.9
cd /d "%~dp0"
node chat.js %*
if %errorlevel% neq 0 pause
