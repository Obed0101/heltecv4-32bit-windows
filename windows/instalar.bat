@echo off
rem Instalador para Arduino IDE 1.8.19 en Windows 7 / 8 / 10 (32 y 64 bits).
rem 1) Anade la URL del paquete al Gestor de tarjetas (con copia de seguridad).
rem 2) Registra el puerto serie USB de la Heltec V4 (necesario en Windows 7 / 8).
rem Despues solo queda instalar el paquete desde el Gestor de tarjetas del IDE.
setlocal enabledelayedexpansion

set "URL=https://github.com/Obed0101/heltecv4-32bit-windows/releases/latest/download/package_heltec_esp32_win32_index.json"
set "KEY=boardsmanager.additional.urls"

echo Cierra el Arduino IDE antes de continuar ^(el IDE sobrescribe sus preferencias al cerrarse^).
pause

set "PREFS=%LOCALAPPDATA%\Arduino15\preferences.txt"
if not exist "%PREFS%" set "PREFS=%APPDATA%\Arduino15\preferences.txt"
if not exist "%PREFS%" (
  echo [FALLO] No se encontro preferences.txt. Abre el Arduino IDE una vez, cierralo y vuelve a ejecutar este instalador.
  echo         O pega esta URL a mano en Archivo - Preferencias - Gestor de URLs Adicionales de Tarjetas:
  echo         %URL%
  goto :fin
)

echo == 1. URL del Gestor de tarjetas
set "OLD="
for /f "usebackq tokens=1,* delims==" %%A in (`findstr /b /c:"%KEY%=" "%PREFS%"`) do set "OLD=%%B"
if defined OLD if not "!OLD:%URL%=!"=="!OLD!" (
  echo [OK] La URL ya estaba configurada.
  goto :driver
)
if defined OLD (set "NEW=!OLD!,%URL%") else (set "NEW=%URL%")
copy /y "%PREFS%" "%PREFS%.antes-de-heltec.bak" >nul
findstr /v /b /c:"%KEY%=" "%PREFS%.antes-de-heltec.bak" > "%PREFS%.nuevo"
>> "%PREFS%.nuevo" echo %KEY%=!NEW!
move /y "%PREFS%.nuevo" "%PREFS%" >nul
echo [OK] URL anadida. Copia de seguridad: %PREFS%.antes-de-heltec.bak

:driver
echo == 2. Puerto serie USB de la Heltec V4
ver | findstr /c:" 10." >nul
if not errorlevel 1 (
  echo [OK] Windows 10 o posterior asigna el puerto COM automaticamente.
  goto :pasos
)
pnputil -i -a "%~dp0heltec-v4-usb-serial.inf"
if errorlevel 1 (
  echo [AVISO] No se pudo registrar el controlador. Ejecuta este instalador con clic derecho - "Ejecutar como administrador",
  echo         o en el Administrador de dispositivos elige "Actualizar controlador" y selecciona esta carpeta.
) else echo [OK] Controlador registrado. Acepta el aviso de controlador sin firmar si aparece.

:pasos
echo.
echo Siguiente paso, en el Arduino IDE:
echo   Herramientas - Placa - Gestor de tarjetas - buscar "heltec" - Instalar
echo   "Heltec ESP32 Series (Windows 32-bit / Windows 7)"   ^(descarga de unos 950 MB^)
echo Despues ejecuta verificar-instalacion.bat para comprobar que todo arranca.

:fin
endlocal
pause
