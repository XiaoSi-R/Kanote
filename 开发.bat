@echo off
title Kanote [开发模式]
cd /d "%~dp0"
echo ========================================
echo  开发模式 - Flask 后端热重载
echo  浏览器打开 http://127.0.0.1:56789
echo  按 Ctrl+C 退出
echo ========================================
"%~dp0python\python.exe" "%~dp0backend\dev.py"
