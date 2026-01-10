# Módulo Asistente AI de Análisis - Arquitectura de Componentes

## 📋 Descripción General

Este módulo implementa una interfaz de chat inteligente completa para la plataforma Biometric, permitiendo a los investigadores interactuar con modelos de IA (Google Gemini) para análisis de datos biomédicos.

## 🏗️ Estructura de Componentes

### Componente Principal

**`/components/AIAssistant.tsx`**
- Componente contenedor principal que orquesta todo el módulo
- Gestiona el estado global del chat (mensajes, modelo seleccionado, chat activo)
- Coordina la comunicación entre todos los subcomponentes
- Maneja la lógica de envío de mensajes y simulación de respuestas de IA

### Subcomponentes (en `/components/ai-chat/`)

#### 1. **ChatSidebar.tsx**
**Responsabilidad:** Panel lateral izquierdo (~25% ancho)
- Botón "Nuevo Chat" prominente con gradiente teal
- Lista scrollable del historial de conversaciones
- Cada item muestra: título, timestamp relativo, y botones de acción (renombrar/eliminar)
- Highlight visual para el chat activo
- Footer con contador de conversaciones

**Props:**
```typescript
{
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  activeChatId: string | null;
}
```

#### 2. **ChatHeader.tsx**
**Responsabilidad:** Barra superior del área de conversación
- Título del chat actual con barra decorativa teal
- Selector de modelo de IA (dropdown)
- Muestra modelo activo con badge visual
- Opciones: Gemini Pro, Gemini Pro Vision, Gemini Ultra

**Props:**
```typescript
{
  chatTitle: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
}
```

#### 3. **MessageList.tsx**
**Responsabilidad:** Área central scrollable de mensajes
- Renderiza lista de mensajes del chat
- Auto-scroll al último mensaje
- Estado vacío con sugerencias visuales
- Indicador de carga con animación de "pensando..."
- Layout centrado con max-width para legibilidad

**Props:**
```typescript
{
  messages: Message[];
  isLoading?: boolean;
}
```

#### 4. **ChatMessageBubble.tsx**
**Responsabilidad:** Renderizado individual de mensajes
- Bubbles diferenciados para usuario (derecha, teal) vs IA (izquierda, blanco)
- Avatares con iconos (Bot/User)
- Soporte completo de Markdown para mensajes de IA:
  - Listas (ul/ol)
  - Código inline y bloques
  - Tablas
  - Texto en negrita
- Timestamps relativos

**Props:**
```typescript
{
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  };
}
```

#### 5. **ChatInputArea.tsx**
**Responsabilidad:** Barra inferior de entrada (footer)
- Textarea auto-expandible con manejo de Enter/Shift+Enter
- **Botón de adjuntar archivos** (CSV, Excel, imágenes)
- Preview visual de archivos adjuntos con opción de eliminar
- Botón de envío con estado disabled inteligente
- Hints de teclado y formatos soportados
- Contador de caracteres

**Props:**
```typescript
{
  onSendMessage: (message: string, files?: File[]) => void;
  disabled?: boolean;
}
```

## 🎨 Diseño y Estética

### Layout Principal
```
┌─────────────────────────────────────────────────────┐
│                    Header (Sticky)                   │
├──────────┬──────────────────────────────────────────┤
│          │         ChatHeader (Model Selector)       │
│          ├──────────────────────────────────────────┤
│   Chat   │                                           │
│ Sidebar  │         MessageList (Scrollable)         │
│  (25%)   │              (Messages)                   │
│          │                                           │
│          ├──────────────────────────────────────────┤
│          │      ChatInputArea (Input + Upload)      │
└──────────┴──────────────────────────────────────────┘
```

### Paleta de Colores
- **Usuario:** Gradiente teal-500 a teal-600 (coherente con Biometric)
- **IA:** Fondo blanco con borde slate-200
- **Modelo Selector:** Gradiente purple-50 a indigo-50 (distintivo para IA)
- **Botones de Acción:** Teal-600 a teal-700 (primarios)

### Tipografía
- **Sans-serif:** Inter para UI y texto general
- **Monospace:** IBM Plex Mono para código en respuestas de IA
- Pesos: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

## 🔧 Dependencias Externas

### react-markdown
```bash
npm install react-markdown
```
Utilizada en `ChatMessageBubble.tsx` para renderizar Markdown en respuestas de IA.

## 📦 Características Implementadas

✅ **Chat en tiempo real** con UI moderna tipo ChatGPT
✅ **Subida de archivos** múltiples (CSV, Excel, imágenes)
✅ **Soporte Markdown** completo en respuestas de IA
✅ **Historial persistente** con navegación por sesiones
✅ **Selector de modelos** (Gemini Pro/Vision/Ultra)
✅ **Auto-scroll** a nuevos mensajes
✅ **Estados de carga** con animaciones
✅ **Responsive design** (desktop-first)
✅ **Accesibilidad** con tooltips y aria-labels

## 🚀 Próximas Mejoras Sugeridas

1. **Integración real con Google Gemini API**
   - Reemplazar respuesta simulada en `AIAssistant.tsx`
   - Implementar streaming de respuestas
   - Manejo de errores de API

2. **Persistencia de datos**
   - Guardar historial en localStorage o Supabase
   - Sincronización entre dispositivos

3. **Análisis de archivos**
   - Parser de CSV para análisis estadístico
   - OCR para imágenes de gráficos
   - Visualización de datos adjuntos

4. **Funciones avanzadas**
   - Exportar conversación a PDF
   - Compartir chats con colaboradores
   - Búsqueda en historial
   - Voice input (Speech-to-Text)

## 💡 Notas de Implementación

- La app inicia en la vista `asistente-ia` por defecto (App.tsx línea 10)
- Los componentes usan Tailwind CSS puro sin dependencias adicionales de UI
- El diseño sigue estrictamente la guía de estilo de Biometric (teal/medical blue)
- Todo el texto está en español para investigadores de habla hispana
- La arquitectura permite fácil extensión con nuevos modelos de IA

## 🔗 Integración con el Resto de la App

El módulo se integra perfectamente con:
- **Sidebar:** Nueva opción "Asistente IA" con icono Sparkles
- **Header:** Título y subtítulo específicos
- **Routing:** Sistema de vistas existente en App.tsx
- **Estética:** Coherente con módulos de Estadística Descriptiva

---

**Creado por:** Arquitectura diseñada siguiendo especificaciones de Figma AI Design Prompt
**Versión:** 1.0
**Última actualización:** Enero 2026
