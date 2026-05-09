# Control Horarios Chile

Página web estática para planificar horarios semanales de colaboradores en Chile. Permite ingresar colaboradores, asignar sección de trabajo, registrar turnos diarios, marcar días libres y calcular horas semanales y horas extra estimadas.

## Funciones

- Registro de colaboradores con nombre, cargo, sección, tipo de contrato y horas pactadas.
- Planificador semanal con entrada, salida y día libre por cada día.
- Resumen por colaborador con total semanal, límite aplicado y horas extra estimadas.
- Indicadores generales de dotación, secciones activas, horas programadas y horas extra.
- Configuración del límite legal vigente, precargado en **42 horas semanales** para la etapa chilena vigente desde el 26 de abril de 2026.
- Persistencia local con `localStorage`, impresión y exportación a PDF desde el navegador.

## Uso

1. Abre `index.html` en un navegador moderno.
2. Agrega o elimina colaboradores en la sección **Ingresar colaborador y sección**.
3. Selecciona la semana y registra horarios en **Horario semanal**.
4. Revisa el bloque **Resumen legal y horas extra** para detectar excesos semanales o alertas diarias.

> La herramienta es referencial y no reemplaza asesoría laboral. Deben revisarse contratos, pactos, descansos, colación, dictámenes y reglas especiales aplicables a cada empresa.
