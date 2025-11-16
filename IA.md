Retrospectiva del Uso de Inteligencia Artificial
================================================

1\. Herramientas de IA utilizadas
---------------------------------

Durante el proyecto utilicé ChatGPT 5, GitHub Copilot y Cursor AI como herramientas de apoyo. Su función fue acelerar tareas repetitivas, asistir en depuración, ofrecer alternativas técnicas y ayudar a redactar tests iniciales para los contratos.Las decisiones de arquitectura, la lógica de los smart contracts, el diseño del frontend y la integración completa fueron realizadas y verificadas manualmente por mí.

2\. Tiempo aproximado invertido
-------------------------------

Smart contracts: entre 12 y 15 horas entre diseño, desarrollo, testing y refinamiento. La IA colaboró especialmente proponiendo borradores de tests en Foundry, pero la implementación final, correcciones y validaciones fueron hechas a mano.Frontend: entre 10 y 12 horas. Aunque parte del código se generó con IA, la adaptación, la lógica y la organización final del proyecto fueron responsabilidad manual.Reflexión y planificación: entre 8 y 12 horas evaluando arquitectura, comparando enfoques y definiendo siempre las decisiones clave antes de escribir código.

Tiempo total estimado: entre 38 y 51 horas combinando desarrollo y reflexión.

3\. Errores más comunes
-----------------------

En smart contracts surgieron problemas típicos de Solidity como structs con mappings, validaciones de roles, tipos en eventos y diferencias entre prank y startPrank en los tests.En el frontend aparecieron errores de conversión BigInt, detalles de ethers v6, estados de carga y parámetros de rutas.En la integración hubo direcciones equivocadas, ABIs desactualizados y errores al conectar con Anvil.

Un problema recurrente fue que la IA a veces sobrescribía código funcional. Para evitar pérdidas, utilicé commits frecuentes y ramas separadas, manteniendo siempre el control sobre la versión final.

4\. Fuentes y archivos de chats
-------------------------------

Usé sesiones específicas con ChatGPT para analizar arquitectura, diseñar partes críticas de los contratos y revisar ideas.Cursor AI se utilizó para generar borradores de componentes y ayudar en depuración del frontend y los contratos.Copilot aportó sugerencias útiles para código repetitivo y pequeños refactors.La IA también fue útil para crear borradores de tests en Foundry, que luego ajusté y corregí manualmente según los requerimientos reales del sistema.

5\. Lección principal
---------------------

La IA acelera el trabajo y permite iterar más rápido, especialmente al generar borradores y tests iniciales. Sin embargo, el criterio, la revisión y la arquitectura final deben mantenerse bajo control del desarrollador. Un flujo de versiones claro fue esencial para combinar las sugerencias de IA con un desarrollo ordenado y fiable.

Si querés, te hago una versión muy corta para entregar como “resumen ejecutivo”, o una versión más formal para un informe académico.