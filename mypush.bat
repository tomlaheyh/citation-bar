@echo off
REM ---------------------------------------------------------------------
REM  mypush - commit everything, sync with the remote, push.
REM
REM  The drift collector Action commits drift/drift-data.csv every morning,
REM  so the remote is normally ahead of this working copy. Pushing without
REM  pulling first is rejected. The rebase puts your commit on top of the
REM  Action's rather than making a merge bubble every single day.
REM ---------------------------------------------------------------------

if "%~1"=="" (
    echo Usage: mypush your commit message here
    exit /b 1
)

git add .
git commit -m "%*"

git pull --rebase
if errorlevel 1 (
    echo.
    echo ==========================================================
    echo  PULL FAILED - the rebase stopped and NOTHING was pushed.
    echo.
    echo  Your commit is safe. Either finish the rebase:
    echo      git rebase --continue
    echo  or back out of it completely:
    echo      git rebase --abort
    echo ==========================================================
    exit /b 1
)

git push
if errorlevel 1 (
    echo.
    echo PUSH FAILED - your commit is local only. Nothing was lost.
    exit /b 1
)

echo.
echo Pushed.
