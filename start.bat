@echo off
setlocal
cd /d "%~dp0"
title Arrange Engineer - 개발 서버

echo.
echo ==========================================================
echo    Arrange Engineer - 개발 서버 (테스트용)
echo ==========================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :nonode

for /f "delims=" %%v in ('node -v') do echo    Node.js %%v 확인됨

if not exist "node_modules" goto :install
goto :run

:install
echo.
echo    최초 실행입니다. 필요한 패키지를 설치합니다. (1~2분 걸립니다)
echo.
call npm install --no-audit --no-fund
if errorlevel 1 goto :installfail
goto :run

:run
echo.
echo    서버를 시작합니다. 잠시 후 브라우저가 자동으로 열립니다.
echo    종료하려면 이 창에서 Ctrl+C 를 누르거나 창을 닫으세요.
echo.
call npm run dev -- --open
echo.
echo    서버가 종료되었습니다.
pause
exit /b 0

:nonode
echo    [오류] Node.js 가 설치되어 있지 않습니다.
echo           https://nodejs.org 에서 LTS 버전 설치 후 다시 실행해주세요.
echo.
pause
exit /b 1

:installfail
echo.
echo    [오류] 패키지 설치에 실패했습니다. 위 메시지를 확인해주세요.
echo.
pause
exit /b 1
