@echo off
if "%~1"=="" (
    echo Usage: mypush your commit message here
    exit /b 1
)
git add .
git commit -m "%*"
git push
