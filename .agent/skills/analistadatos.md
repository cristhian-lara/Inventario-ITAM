---
name: analista-de-datos
description: Usar cuando se necesite analizar datos para tomar decisiones de negocio, diseñar algoritmos estadísticos o de machine learning, crear visualizaciones de datos o presentar insights a stakeholders. Incluye detección de tendencias, atribución, experimentación A/B, segmentación de usuarios y reporting ejecutivo.
Skill: Analista de Datos
Transforma datos en insights accionables y narrativas claras que impulsen la toma de decisiones.
Visión General
Esta skill combina metodología estadística rigurosa con comunicación efectiva de datos. Ayuda a:
Analizar: Seleccionar y aplicar métodos estadísticos o de ML adecuados
Diseñar: Definir métricas, umbrales y lógica de decisión
Comunicar: Presentar resultados de forma clara y orientada a la acción
El enfoque prioriza la interpretación, el contexto y las limitaciones de los datos.
---
Cuándo Usar Esta Skill
Utiliza esta skill cuando el problema implique análisis o interpretación de datos, especialmente en los siguientes casos:
Diseño de algoritmos: lógica de decisión basada en datos
Selección de métodos: elegir entre tests estadísticos, regresión o ML
Diseño de umbrales: criterios de clasificación o alertas
Análisis de tendencias: cambios, crecimiento, estacionalidad o anomalías
Modelos de atribución: entender qué impulsa resultados o conversiones
Reporting ejecutivo: explicar resultados a perfiles no técnicos
Experimentación A/B: diseño, análisis e interpretación de experimentos
---
Flujo de Trabajo Analítico
Problema → Clasificar → Seleccionar método → Diseñar métricas → Definir umbrales → Contar la historia
Este flujo debe respetarse siempre que sea posible.
---
Metodología Principal
Detección de Tendencias
Ratio de crecimiento = media_actual / media_base
Coeficiente de variación (CV) para evaluar estabilidad
Detección de puntos de cambio para identificar inflexiones
Comparación Estadística
Escenario	Datos normales	Datos no normales
2 grupos	t-test	Mann-Whitney
3+ grupos	ANOVA	Kruskal-Wallis
Siempre justificar la elección del test y mencionar supuestos.
---
Modelos de Atribución
Primer contacto (awareness)
Último contacto (conversión)
Lineal (peso uniforme)
Basado en posición (40/20/40)
Data-driven (modelos ML)
Explicar ventajas, limitaciones y contexto de uso de cada modelo.
---
Reglas de Interpretación
No asumir causalidad sin evidencia experimental
Señalar posibles sesgos o problemas de calidad de datos
No inventar datos faltantes
Indicar claramente incertidumbre y márgenes de error
Priorizar conclusiones accionables sobre tecnicismos
---
Archivos de Referencia
Archivo	Contenido
`seleccion_metodos.md`	Árbol de decisión para tipos de análisis
`series_temporales.md`	Estacionariedad, tendencias, forecasting
`inferencia_estadistica.md`	Hipótesis, tamaños de efecto
`regresion_atribucion.md`	Regresión y atribución
`metodos_ml.md`	Clustering, clasificación, PCA
`diseno_umbrales.md`	Metodologías para definir umbrales
