# Heltec WiFi LoRa 32 V4 en Arduino IDE 1.8.19 — Windows de 32 bits / Windows 7

Paquete de Gestor de tarjetas que instala el core oficial **Heltec ESP32 3.3.8** en PCs
donde el índice oficial (`package_heltec_esp32_index.json`) no puede funcionar.

## Por qué el índice oficial falla en estas PCs

| Pieza del paquete oficial | Problema | Qué hace este paquete |
|---|---|---|
| `esptool` 5.2.0 | Para el host de 32 bits apunta al zip `windows-amd64` (64 bits). esptool 5 exige Python 3.10, que no existe para Windows 7 | Python 3.8.10 de 32 bits embebido + esptool 4.8.1, con un traductor de argumentos (`esptool_cli.py`) |
| `gen_esp32part.exe`, `espota.exe`, `gen_insights_package.exe` del core | Son ejecutables de 64 bits | Se ejecutan sus fuentes `.py` (incluidas en el core) con el mismo Python |
| Lanzadores `xtensa-esp32s3-elf-*.exe` del compilador | Requieren Windows 10 | Se llama al compilador real `xtensa-esp-elf-*` con `-mdynconfig`, que es lo que hace el lanzador |
| Toolchain RISC-V, GDB y OpenOCD | ~770 MB que la V4 no usa | No se instalan (la única placa ESP32-C3 queda oculta) |

`platform.txt`, `boards.txt`, variantes, bootloaders y librerías son los de Heltec, sin tocar.
Todos los cambios están en `platform.local.txt` y `boards.local.txt` y solo afectan a Windows.

## Instalación en la PC con Windows

Requisitos: Arduino IDE 1.8.19, ~3 GB libres y ~950 MB de descarga. En Windows 7: Service Pack 1
y la actualización [KB2999226](https://support.microsoft.com/kb/2999226) (Universal C Runtime).

URL para el Gestor de tarjetas (la forma estándar de Arduino):

```
https://github.com/Obed0101/heltecv4-32bit-windows/releases/latest/download/package_heltec_esp32_win32_index.json
```

1. Añadir la URL. Dos formas equivalentes:
   - **Con instalador:** descargar `heltec-v4-instalador-windows.zip` de la
     [última release](https://github.com/Obed0101/heltecv4-32bit-windows/releases/latest),
     descomprimirlo y ejecutar `instalar.bat` con el IDE cerrado. Añade la URL (guardando copia
     de `preferences.txt`) y registra el puerto serie USB.
   - **A mano:** **Archivo → Preferencias → Gestor de URLs Adicionales de Tarjetas** y pegar la URL.

   No añadir a la vez la URL oficial de Heltec.
2. **Herramientas → Placa → Gestor de tarjetas**: buscar `heltec` e instalar
   *Heltec ESP32 Series (Windows 32-bit / Windows 7)*.
3. Ejecutar `verificar-instalacion.bat`. Comprueba que Python y el compilador arrancan;
   no toca la placa.
4. Conectar la V4 por USB-C. Si en Windows 7 aparece como dispositivo desconocido: en el
   Administrador de dispositivos, *Actualizar controlador* y elegir la carpeta del instalador
   (`heltec-v4-usb-serial.inf`). Windows avisará de que el controlador no está firmado; en
   Windows 7 de 32 bits se puede aceptar.
5. **Herramientas**: Placa *Heltec WiFi LoRa 32(V4)*, el puerto COM nuevo,
   *USB CDC On Boot: Enabled* para ver el monitor serie.

Si la carga no conecta: mantener **PRG**, pulsar **RST**, soltar **PRG** y volver a cargar.

### La placa no se puede dañar por una carga fallida

El gestor de arranque de fábrica del ESP32-S3 está en ROM y no se puede sobrescribir. Si una carga
se interrumpe o el programa queda mal, la secuencia PRG + RST de arriba vuelve a dejarla lista para
cargar de nuevo.

## Construir el paquete

```sh
bun scripts/build.ts --base-url https://github.com/<usuario>/<repo>/releases/download/<tag>
```

Genera en `dist/` el índice JSON y los dos zips que hay que subir a esa *release*. Las descargas
están fijadas por SHA-256 en `config/sources.json`.

```sh
python3 -m unittest discover tests
```

## Licencias

El core es el de Heltec / Espressif (LGPL-2.1). El zip de esptool incluye CPython 3.8.10 (PSF),
esptool 4.8.1 (GPL-2.0-or-later), pyserial e intelhex (BSD), sin modificar; ver `THIRD_PARTY.txt`
dentro del zip. Este repositorio no está afiliado a Heltec.

## Qué está comprobado y qué no

Comprobado en macOS, con el contenido exacto de los zips:

- esptool 4.8.1 sobre Python 3.8 con el traductor produce `bootloader.bin`, la imagen de la
  aplicación y `merged.bin` **idénticos byte a byte** a los de esptool 5.2.0 oficial (ESP32-S3).
- El compilador real con `-mdynconfig` genera objetos y ELF idénticos a los del lanzador.
- Los 52 ejecutables reales del toolchain i686 solo importan funciones de `KERNEL32`/`msvcrt`/`USER32`
  disponibles en Windows 7.

**No comprobado:** la instalación en un Arduino IDE 1.8.19 real, la ejecución en Windows 7 de
32 bits, `instalar.bat`, el archivo `.inf` y la carga a una placa. La primera instalación en la PC destino es la
prueba real; `verificar-instalacion.bat` indica en qué punto falla si algo no arranca.
