# Futuras Mejoras - Cheapforge

Documento con propuestas de mejoras para futuras versiones.

---

## 1. Métodos de Luminancia

**Prioridad: Alta** | **Complejidad: Baja**

Diferentes métodos para convertir imagen a color a escala de grises. Cada uno produce resultados diferentes según el contenido de la imagen.

### Opciones a implementar

| Método | Fórmula | Uso recomendado |
|--------|---------|-----------------|
| **Standard** | `0.2126*R + 0.7152*G + 0.0722*B` (Rec.709) | Uso general, simula percepción humana |
| **Max Channel** | `max(R, G, B)` | Preservar detalles en colores saturados |
| **Scaled Max Channel** | `max(R,G,B) / ((R+G+B)/3)` normalizado | Mejor rango dinámico |
| **Combo** | Mezcla de Standard + Max Channel | Balance entre ambos métodos |
| **Color Aware** | Ajusta peso según saturación | Fotos con colores muy vivos |
| **Color Pop** | Realza diferencias de color | Imágenes con poco contraste tonal |

### Ejemplo de impacto

Foto con cielo azul intenso y nubes blancas:
- **Standard**: Azul y blanco salen casi igual (poco contraste)
- **Max Channel**: Azul sale más oscuro, mejor separación

### Implementación

- Añadir selector en UI (ModelGeometry o nuevo panel)
- Modificar `image_processor.py` para soportar diferentes métodos
- Pasar método seleccionado en la solicitud de procesamiento

---

## 2. Curva de Transferencia Personalizable

**Prioridad: Alta** | **Complejidad: Media**

Actualmente se usa gamma (curva fija). Una curva editable con puntos de control permite ajustar cómo se mapea brillo → profundidad de forma más precisa.

### Beneficios

- Ajuste fino para fotos con mucho contraste
- Recuperar detalle en sombras o luces
- Control más intuitivo que solo gamma

### Implementación

- Componente React para editar curva (canvas con puntos arrastrables)
- Almacenar puntos de control en el store
- Interpolar curva (bezier o lineal) en Python
- Aplicar curva al heightmap

### Referencias

- Curvas de Photoshop/Lightroom
- La imagen de referencia de ItsLitho muestra una curva diagonal con área editable

---

## 3. Dynamic Depth (Profundidad Dinámica)

**Prioridad: Media** | **Complejidad: Baja**

Analizar el histograma de la imagen y ajustar automáticamente min/max depth para aprovechar todo el rango tonal.

### Beneficios

- Evita que imágenes con poco contraste queden "planas"
- Optimización automática sin intervención manual
- Opción de un clic para mejorar resultado

### Implementación

- Calcular histograma de la imagen procesada
- Encontrar percentiles (ej: 2% y 98%) para ignorar outliers
- Mapear ese rango al min/max depth configurado
- Botón "Auto" junto a los campos de profundidad

---

## 4. Modos de Preview Adicionales

**Prioridad: Media** | **Complejidad: Media**

Actualmente solo hay preview retroiluminado. Añadir más modos de visualización.

### Modos propuestos

1. **Retroiluminado** (actual) - Luz detrás, simula ventana
2. **Luz frontal** - Luz delante, simula pared
3. **Luz ambiente** - Combinación de ambas
4. **Sin iluminación** - Solo el modelo con colores de filamento planos

### Implementación

- Añadir selector de modo en PreviewArea
- Modificar shaders/colores según modo seleccionado
- Retroiluminado: modelo actual
- Frontal: iluminación difusa desde cámara
- Ambiente: mezcla de ambos

---

## 5. Brightness Compensation

**Prioridad: Media** | **Complejidad: Media**

Ajustar el brillo de forma no lineal para compensar cómo el ojo percibe la luz a través del material.

### Concepto

El ojo humano no percibe la luz de forma lineal. Una compensación de brillo puede hacer que el resultado impreso se vea más "natural".

### Implementación

- Investigar curvas de compensación estándar
- Aplicar como post-proceso al heightmap
- Slider para controlar intensidad de compensación

---

## 6. Gestión de Perfiles de Filamentos

**Prioridad: Media** | **Complejidad: Baja**

Guardar y cargar configuraciones de filamentos calibrados.

### Funcionalidades

- Exportar perfil de filamentos a archivo JSON
- Importar perfil existente
- Biblioteca de perfiles predefinidos para marcas comunes
- Sincronización entre proyectos

### Implementación

- Botones exportar/importar en FilamentPanel
- Formato JSON con nombre, color, d95, td
- Almacenamiento local de perfiles guardados

---

## 7. Validación Inteligente

**Prioridad: Media** | **Complejidad: Baja**

Mostrar warnings cuando la configuración puede dar problemas.

### Casos a validar

- Muy pocas capas entre cambios de filamento (< 3 capas)
- Rango de profundidad muy pequeño para los filamentos
- Resolución de mesh muy baja para el tamaño de impresión
- Filamentos con d95 muy similar (difícil distinguir)
- Imagen con muy poco contraste

### Implementación

- Componente de validación que analiza estado actual
- Mostrar iconos de warning junto a campos problemáticos
- Panel de resumen con todos los warnings

---

## 8. Reducir Tamaño del Sidecar

**Prioridad: Baja** | **Complejidad: Media**

Scipy añade ~50MB al ejecutable. Se podría reemplazar por alternativas más ligeras.

### Uso actual de Scipy

- `scipy.ndimage.zoom` - Para redimensionar heightmap

### Alternativas

- Usar `PIL.Image.resize` con el heightmap convertido a imagen
- Implementar interpolación bilineal con numpy puro
- Usar `cv2.resize` si OpenCV ya está incluido

### Beneficios

- Ejecutable más pequeño (~50MB menos)
- Build más rápido
- Menos dependencias

---

## 9. Unbias Lighting

**Prioridad: Baja** | **Complejidad: Alta**

Corregir fotos con iluminación desigual (flash más fuerte en un lado, sombras).

### Concepto

Detectar gradiente de iluminación en la imagen y compensarlo para obtener brillo uniforme.

### Implementación

- Detectar iluminación de baja frecuencia (blur muy fuerte)
- Dividir imagen original por esta capa de iluminación
- Normalizar resultado

### Nota

Esta funcionalidad quizás es mejor hacerla en Photoshop/GIMP antes de importar. Añade complejidad significativa.

---

## 10. Asistente de Calibración de Filamentos

**Prioridad: Baja** | **Complejidad: Media**

Guía paso a paso para medir el d95 correctamente.

### Flujo propuesto

1. Generar STL de calibración (escalones de diferentes grosores)
2. Instrucciones para imprimir
3. Guía visual para identificar el grosor donde la línea negra casi no se ve
4. Input del valor medido

### Implementación

- Modal con pasos y imágenes explicativas
- Generador de STL de calibración
- Calculadora de d95 basada en medición

---

## Orden de Implementación Sugerido

1. **Métodos de Luminancia** - Fácil, alto impacto
2. **Dynamic Depth** - Fácil, mejora UX
3. **Gestión de Perfiles** - Fácil, muy útil para usuarios frecuentes
4. **Validación Inteligente** - Fácil, mejora UX
5. **Curva de Transferencia** - Media complejidad, alto impacto visual
6. **Modos de Preview** - Media complejidad, útil para previsualización
7. **Reducir Sidecar** - Optimización, no afecta funcionalidad
8. **Brightness Compensation** - Requiere investigación
9. **Asistente Calibración** - Nice to have
10. **Unbias Lighting** - Complejo, casos de uso limitados
