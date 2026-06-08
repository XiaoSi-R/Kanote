@echo off
title Kanote
cd /d "%~dp0"
start "" "%~dp0python\pythonw.exe" "%~dp0backend\app.py"
