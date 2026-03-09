# Proyecto UI Soficoop

Este proyecto sirve como plantilla inicial para construir aplicaciones Angular con PrimeNG y PrimeFlex.

## Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone [url_del_repositorio] soficoop-ui
    ```
2.  **Navegar al directorio del proyecto:**
    ```bash
    cd soficoop-ui
    ```
3.  **Instalar dependencias:**
    ```bash
    npm install
    ```

## Uso

1.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm start
    ```
    Esto compilará la aplicación y la abrirá en su navegador (normalmente en `http://localhost:4200/`).

2.  **Compilar para producción:**
    ```bash
    npm run build
    ```
    Los archivos listos para producción se encontrarán en el directorio `dist/sakai-ng`.

## Estructura del Proyecto

El proyecto sigue una estructura estándar de Angular CLI. Los directorios clave incluyen:

-   `src/app`: Contiene la lógica principal y los componentes de la aplicación.
    -   `layout`: Componentes principales del layout (barra superior, barra lateral, menú, etc.).
    -   `pages`: Páginas individuales de la aplicación (dashboard, autenticación, etc.).
    -   `assets`: Archivos estáticos como imágenes, estilos y fuentes.
-   `src/assets/layout`: Archivos SCSS para el estilo del layout.

## Personalización

-   **Temas:** Personalice el tema de la aplicación modificando las variables SCSS en `src/assets/layout/variables/_variables.scss` o ajustando la configuración de temas en `app.configurator.ts`.
-   **Componentes:** Desarrolle nuevos componentes dentro del directorio `src/app`, siguiendo las convenciones existentes.
-   **Páginas:** Agregue nuevas páginas en `src/app/pages` y configure sus rutas en `src/app/app.routes.ts` o en los módulos de enrutamiento de características respectivas.

## Notas Importantes

-   Este proyecto utiliza componentes standalone de Angular.
-   Las plantillas y estilos en línea han sido extraídos a archivos `.html` y `.scss` separados para una mejor mantenibilidad.
-   Se recomienda Node.js versión 18 o superior.
