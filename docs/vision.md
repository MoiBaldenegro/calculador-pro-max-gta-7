# Visión del producto — Calculador Pro Max GTA 7

> Documento de descubrimiento. Define **qué** construimos y **para quién**. No contiene código ni decisiones de implementación detalladas (eso corresponde al planner).

## Problema

Las webs de calculadoras suelen estar llenas de anuncios, requieren registro o no permiten graficar funciones fácilmente. Queremos una calculadora científica **instantánea, sin fricción y sin backend**: abrir una URL, calcular y graficar funciones, sin instalar nada ni crear cuenta.

## Usuarios

- **Estudiantes de secundaria/universidad** que necesitan resolver operaciones y ver la forma de una función `f(x)` rápido, desde el móvil o el portátil.
- **Docentes y divulgadores** que quieren mostrar una gráfica en clase sin depender de software instalado.
- **Público general** que necesita una calculadora fiable y una gráfica puntual.

Idioma de la interfaz: **español**. Navegadores modernos de escritorio y móvil.

## Alcance del MVP (lista verificable)

Cada punto debe poder comprobarse abriendo la web desplegada.

1. Página estática pública servida en **GitHub Pages**, accesible sin login.
2. **Calculadora científica** funcional con: `+ − × ÷`, paréntesis, potencias, raíz cuadrada, `sin`, `cos`, `tan`, `log`, `ln`, exponencial y constantes `π` y `e`.
3. Entrada por **teclado** y por **botones en pantalla**, con soporte de borrar y limpiar.
4. **Evaluación segura** de expresiones sin `eval` del navegador; los errores de sintaxis o matemáticos (p. ej. división por cero) se muestran con un mensaje claro y **no rompen la página**.
5. **Historial visible** de los últimos cálculos de la sesión (se pierde al recargar; no hay persistencia en servidor).
6. **Graficador de funciones**: un campo para escribir expresiones en `x`, dibujo de la curva en un canvas, posibilidad de **varias funciones simultáneas** con colores distintos.
7. Controles del graficador: **zoom** y **paneo**, y ejes con marcas legibles.
8. Diseño **responsive**: usable en móvil (≥360 px) y escritorio.
9. **100 % estático**: sin backend, sin base de datos, sin cookies de seguimiento.
10. **Repositorio público** en GitHub y **despliegue automático** a GitHub Pages en cada push a `main`.
11. `README` con qué hace el proyecto, cómo usarlo y cómo se despliega.

## Fuera de alcance (MVP)

- Login, cuentas o sincronización entre dispositivos.
- Cálculo simbólico (CAS), resolución de ecuaciones o derivadas/integrales simbólicas.
- Estadística avanzada, matrices, conversores de unidades.
- Persistencia en servidor o guardado de gráficas entre sesiones.
- Multi-idioma (solo español), temas personalizables o plugins.
- PWA / funcionamiento offline garantizado.
- Dominio propio (se usa la URL `*.github.io`).
- Cualquier tipo de anuncios o analítica invasiva.

## Supuestos

- **"Gráficas algorítmicas" = graficar funciones matemáticas de una variable, `f(x)`** sobre un plano cartesiano con zoom y paneo. Es la interpretación que más encaja con "calculadora web útil"; si el humano quería otra cosa (p. ej. diagramas de flujo de algoritmos o visualización de estructuras de datos), debe corregirlo.
- El **repositorio público ya existe** (`MoiBaldenegro/calculador-pro-max-gta-7`) y GitHub Pages está disponible para él.
- El público es **hispanohablante**; la interfaz va en español.
- No hay restricciones de navegador más allá de "navegadores modernos actuales".
- No se requiere dominio propio ni backend: el despliegue es 100 % estático.
- Se acepta perder el historial y las gráficas al recargar la página en el MVP.

## Stack elegido

- **HTML5 + CSS3 + JavaScript moderno (vanilla, ES modules)**, sin frameworks ni paso de build.
- **Canvas 2D** para el graficador (rendimiento suficiente y cero dependencias).
- **GitHub Pages** como hosting, con despliegue automático desde `main` (GitHub Actions o publicación directa de la raíz).
- Motivo: mínima complejidad, cero dependencias, fácil de auditar, desplegar y mantener por cualquier agente futuro.

## Criterios de éxito

- La URL de GitHub Pages carga la calculadora y el graficador **sin errores en consola**.
- Un usuario nuevo puede, sin instrucciones externas, **resolver una operación aritmética** y **graficar al menos una función `f(x)`** en menos de un minuto.
- La web funciona correctamente en las **últimas versiones de Chrome, Firefox y Safari**, en escritorio y en móvil.
- Cada push a `main` **actualiza el sitio publicado** de forma automática.
- El repositorio es público y su `README` permite a otra persona entender y desplegar el proyecto.
