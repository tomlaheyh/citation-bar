@echo off
setlocal EnableExtensions
rem delete.bat -- moves every timestamped twin (*-vUTC-*) into a _to_delete
rem folder beside it. It moves only and deletes nothing. It never overwrites:
rem a twin whose name is already in that _to_delete is skipped and listed.
rem Skips .git and anything already inside a _to_delete folder.
rem Lists every file first and asks before moving anything.

cd /d "%~dp0"
set "ROOT=%CD%"
set "LIST=%TEMP%\twins_%RANDOM%%RANDOM%.txt"
type nul > "%LIST%"

set /a N=0
for /r "%ROOT%" %%F in (*-vUTC-*) do call :collect "%%~fF"
if %N%==0 (
  echo No twins found.
  goto :end
)

echo.
echo These %N% twins will be moved to a _to_delete folder beside each:
echo.
type "%LIST%"
echo.
choice /c YN /m "Move them now"
if errorlevel 2 (
  echo Nothing moved.
  goto :end
)

set /a MOVED=0
set /a SKIPPED=0
set /a FAILED=0
for /f "usebackq delims=" %%F in ("%LIST%") do call :move "%%F"
echo.
echo Moved %MOVED%, skipped %SKIPPED%, failed %FAILED%.

:end
del "%LIST%" 2>nul
echo.
pause
exit /b

rem ---- add one file to the list, unless it is in .git or a _to_delete folder
:collect
echo "%~1" | find /i "\.git\" >nul && exit /b
echo "%~1" | find /i "\_to_delete\" >nul && exit /b
echo "%~nx1" | find /i "-vUTC-" >nul || exit /b
>>"%LIST%" echo %~1
set /a N+=1
exit /b

rem ---- move one file, never over an existing one, and confirm it landed
:move
set "SRC=%~1"
set "DIR=%~dp1_to_delete"
set "DEST=%~dp1_to_delete\%~nx1"
if exist "%DEST%" (
  echo SKIP   %SRC%   [same name already in _to_delete]
  set /a SKIPPED+=1
  exit /b
)
if not exist "%DIR%\" mkdir "%DIR%"
move "%SRC%" "%DEST%" >nul
if exist "%DEST%" if not exist "%SRC%" (
  echo moved  %SRC%
  set /a MOVED+=1
  exit /b
)
echo FAIL   %SRC%
set /a FAILED+=1
exit /b
