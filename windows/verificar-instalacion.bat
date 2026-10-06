@echo off
rem Comprueba, sin tocar la placa, que las herramientas del paquete arrancan en esta PC.
rem Ejecutar despues de instalar "Heltec ESP32 Series (Windows 32-bit / Windows 7)".
setlocal

set "PKG=%LOCALAPPDATA%\Arduino15\packages\Heltec-esp32-win32"
if not exist "%PKG%" set "PKG=%APPDATA%\Arduino15\packages\Heltec-esp32-win32"
if not exist "%PKG%" (
  echo [FALLO] No se encontro el paquete Heltec-esp32-win32 en Arduino15. Instalalo desde el Gestor de tarjetas.
  goto :fin
)

set "PY="
for /d %%D in ("%PKG%\tools\esptool_py\*") do set "PY=%%D"
set "GCC="
for /d %%D in ("%PKG%\tools\xtensa-esp-elf-gcc\*") do set "GCC=%%D"
set "FALLOS=0"

echo == 1. Python de 32 bits y esptool
"%PY%\python.exe" "%PY%\esptool_cli.py" version
if errorlevel 1 (
  set "FALLOS=1"
  echo [FALLO] Python no arranca. En Windows 7 instala el Service Pack 1 y la actualizacion KB2999226 ^(Universal C Runtime^).
) else echo [OK]

echo == 2. Compilador para ESP32-S3
set "SRC=%TEMP%\heltec_v4_check.c"
echo int heltec_v4_check(int a){return a+1;}> "%SRC%"
"%GCC%\bin\xtensa-esp-elf-gcc.exe" "-mdynconfig=%GCC%\lib\xtensa_esp32s3.so" -Os -c "%SRC%" -o "%TEMP%\heltec_v4_check.o"
if errorlevel 1 (
  set "FALLOS=1"
  echo [FALLO] El compilador no pudo generar codigo para ESP32-S3.
) else echo [OK]
del "%SRC%" "%TEMP%\heltec_v4_check.o" 2>nul

echo == 3. Puertos serie detectados ^(la V4 aparece como 303A:1001^)
"%PY%\python.exe" -c "import serial.tools.list_ports as p; [print(' ', i.device, i.hwid, i.description) for i in p.comports()] or print('  ninguno: instala windows\\heltec-v4-usb-serial.inf')"

echo.
if "%FALLOS%"=="0" (echo RESULTADO: herramientas listas.) else (echo RESULTADO: hay fallos, no intentes cargar la placa todavia.)

:fin
endlocal
pause
