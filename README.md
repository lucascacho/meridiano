# Meridiano

Convierte zonas horarias en un tablero y elige la hora de la llamada. Añades ciudades, comparas el día en columnas y compartes el hueco en el que todos están en horario laboral.

## Qué puedes hacer

- Buscar una ciudad o una zona y sumarla al tablero.
- Ver la misma hora en todas las ciudades: cada columna es el mismo instante.
- Marcar un rango con un toque, arrastrando en el escritorio o deslizando la regla.
- Encontrar el hueco en el que todos coinciden en horario laboral, fines de semana aparte.
- Ajustar el horario de cada ciudad, elegir la ciudad base y guardar el tablero en este navegador.
- Copiar el horario, mandarlo por WhatsApp, abrirlo en Google Calendar o descargar un `.ics`.
- Compartir el enlace: trae las ciudades, el día y la hora elegida.

Las horas salen de la base IANA del navegador, con horario de verano incluido. No hace falta cuenta ni conexión con un servidor de relojes.

## Arranque

```bash
npm install
npm run dev
```

Abre la dirección que imprime Next. `npm test` comprueba la conversión de horas, incluidos los cambios de horario.
