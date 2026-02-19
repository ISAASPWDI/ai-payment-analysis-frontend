# DocAnalyst AI — Frontend

> Interfaz de chat inteligente para análisis de comprobantes de pago, construida con Angular 17 (Standalone Components), Signals y TailwindCSS.

---

## Tabla de contenidos

- [Vista general](#vista-general)
- [Stack tecnológico](#stack-tecnológico)
- [Decisiones técnicas](#decisiones-técnicas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Cómo ejecutar el proyecto](#cómo-ejecutar-el-proyecto)
- [Variables de entorno](#variables-de-entorno)
- [Funcionalidades implementadas](#funcionalidades-implementadas)
- [Integración con el backend](#integración-con-el-backend)

---

## Vista general

El frontend es una **Single Page Application** de tres paneles inspirada en interfaces de chat de productividad modernas:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────────┐   ┌──────────────────────────┐   ┌────────────┐ │
│  │            │   │                          │   │            │ │
│  │  PANEL     │   │   CHAT CENTRAL           │   │  QUICK     │ │
│  │  IZQUIERDO │   │                          │   │  INSIGHTS  │ │
│  │            │   │   DocAnalyst AI          │   │            │ │
│  │  Lista de  │   │   ● En línea             │   │  Métricas  │ │
│  │  comproban │   │                          │   │  Gráfico   │ │
│  │  tes con   │   │   Mensajes del usuario   │   │  semanal   │ │
│  │  búsqueda  │   │   y respuestas del Agent │   │  Por banco │ │
│  │  y filtros │   │                          │   │            │ │
│  │            │   │   [ Input + Adjuntar ]   │   │            │ │
│  └────────────┘   └──────────────────────────┘   └────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Stack tecnológico

| Tecnología | Uso |
|---|---|
| Angular 17 | Framework principal (Standalone Components) |
| Angular Signals | Gestión de estado reactivo sin NgRx |
| TailwindCSS 3 | Estilos utilitarios |
| DM Sans | Tipografía principal (Google Fonts) |
| RxJS | Comunicación HTTP con el backend |
| TypeScript 5 | Tipado estricto end-to-end |

---

## Decisiones técnicas

### 1. Angular Signals en lugar de NgRx o BehaviorSubjects

Angular 17 introduce los Signals como primitiva de reactividad de primera clase. Se optó por `signal()` y `computed()` en lugar de NgRx o BehaviorSubjects porque:

- El estado es simple y local a dos dominios (`vouchers` y `chat`)
- No hay necesidad del overhead de actions/reducers/effects
- `computed()` deriva el estado filtrado automáticamente sin suscripciones manuales
- El código es más legible y con menos boilerplate

```typescript
// Estado reactivo con Signals
readonly vouchers    = signal<Voucher[]>([]);
readonly searchQuery = signal('');
readonly filtered    = computed(() =>
  this.vouchers().filter(v => v.payer.includes(this.searchQuery()))
);
```

### 2. Standalone Components (sin NgModules)

Todos los componentes son standalone, siguiendo el patrón moderno de Angular 17. No hay `NgModule` en el proyecto. Cada componente declara explícitamente sus dependencias en el array `imports`, lo que mejora el tree-shaking y hace el código más auto-documentado.

### 3. Arquitectura de servicios separada por responsabilidad

```
ApiService           → solo comunicación HTTP (un único punto de contacto con el backend)
VoucherStateService  → estado y operaciones de comprobantes
ChatStateService     → estado de conversación y mensajes
```

`ChatStateService` orquesta la experiencia completa: envía el mensaje, actualiza el estado optimista con la burbuja de loading, y al recibir la respuesta sincroniza automáticamente `VoucherStateService` si el Agent procesó un comprobante.

### 4. Proxy de desarrollo para CORS

En lugar de configurar CORS amplio en el backend o usar extensiones de browser, se usa el `proxy.conf.json` de Angular CLI que redirige todas las llamadas en desarrollo:

```
Angular (4200) → /chat/message → proxy → NestJS (3000)/chat/message
```

### 5. Drag & Drop nativo sin librerías

El área de chat acepta archivos por drag & drop usando solo los eventos nativos del DOM (`dragover`, `dragleave`, `drop`), sin dependencias externas como `ng2-file-upload`.

### 6. Control flow con la nueva sintaxis `@if` / `@for`

Se usa la sintaxis de control flow de Angular 17 en lugar de `*ngIf` y `*ngFor`, que es más eficiente en rendimiento y más clara en lectura:

```html
@for (v of state.filtered(); track v.id) { ... }
@if (state.loading()) { ... } @else { ... }
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   ├── voucher.model.ts       ← interfaces Voucher, VoucherInsights, ApiResponse
│   │   │   └── chat.model.ts          ← interfaces ChatMessage, ChatResponse
│   │   └── services/
│   │       ├── api.service.ts         ← HttpClient centralizado, único punto HTTP
│   │       ├── voucher-state.service.ts ← signals: lista, selección, búsqueda, insights
│   │       └── chat-state.service.ts  ← signals: mensajes, conversationId, loading
│   │
│   ├── features/
│   │   ├── vouchers/
│   │   │   └── components/
│   │   │       ├── voucher-panel.component.ts   ← panel izquierdo
│   │   │       └── voucher-panel.component.html
│   │   ├── chat/
│   │   │   └── components/
│   │   │       ├── chat.component.ts            ← chat central + drag & drop
│   │   │       └── chat.component.html
│   │   └── insights/
│   │       └── components/
│   │           ├── insights-panel.component.ts  ← panel derecho + gráfico
│   │           └── insights-panel.component.html
│   │
│   ├── app.component.ts               ← layout raíz de 3 columnas
│   ├── app.component.html
│   ├── app.config.ts                  ← providers standalone (router + httpClient)
│   └── app.routes.ts
│
├── environments/
│   └── environment.ts                 ← apiUrl del backend
│
└── styles.css                         ← Tailwind + DM Sans + scrollbar custom
```

---

## Cómo ejecutar el proyecto

### Prerrequisitos

- Node.js >= 20
- Angular CLI >= 17 (`npm install -g @angular/cli`)
- Backend NestJS corriendo en `http://localhost:3000`

### Instalación y arranque

```bash
# 1. Entrar a la carpeta del frontend
cd payment-frontend

# 2. Instalar dependencias
npm install

# 3. Levantar el servidor de desarrollo
ng serve
```

La aplicación estará disponible en `http://localhost:4200`.

El proxy redirige automáticamente las llamadas al backend en `http://localhost:3000`, por lo que no necesitas configurar CORS.

### Build de producción

```bash
ng build --configuration production
# Output en: dist/payment-frontend/
```

---

## Variables de entorno

El archivo `src/environments/environment.ts` contiene la URL base del backend:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
};
```

Para producción, edita `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://tu-backend.com',
};
```

---

## Funcionalidades implementadas

### Panel izquierdo — Lista de comprobantes

- Lista paginada de comprobantes con búsqueda en tiempo real por pagador, receptor, banco o referencia
- Indicadores de estado con color (`Procesado`, `Pendiente`, `Corregido`, `Rechazado`)
- Selección de comprobante que actualiza el contexto del chat automáticamente
- Skeleton loading mientras carga la lista
- Contador de resultados filtrados vs total

### Chat central — DocAnalyst Agent

- Interfaz de chat con burbujas diferenciadas para usuario y asistente
- Indicador de escritura animado (tres puntos rebotando) mientras el Agent procesa
- Soporte para adjuntar archivos por clic o **drag & drop**
- Preview del archivo adjunto antes de enviarlo
- Chips de sugerencias rápidas en estado vacío
- Badge contextual que muestra el comprobante seleccionado
- Tarjeta de resultado cuando el Agent analiza un comprobante exitosamente
- Detección de intención visible en la respuesta (análisis, insights, consulta)

### Panel derecho — Quick Insights

- Cuatro métricas principales: gasto total, procesados, top emisor, promedio
- Gráfico de barras semanal calculado dinámicamente desde los datos reales
- Tooltip al hover sobre cada barra con el monto exacto
- Breakdown por banco con barras de progreso proporcionales
- Estado vacío ilustrado cuando no hay datos

### Integración en tiempo real

Cuando el Agent analiza un comprobante, el frontend sincroniza automáticamente:
1. Agrega el comprobante al panel izquierdo
2. Recarga los insights en el panel derecho
3. Muestra la tarjeta de resultado en el chat

Todo sin recargar la página ni hacer polling.

---

## Integración con el backend

Todos los endpoints consumidos por el frontend:

| Método | Endpoint | Uso |
|--------|----------|-----|
| `POST` | `/chat/message` | Enviar mensaje con o sin archivo |
| `GET` | `/chat/:id` | Obtener historial de conversación |
| `GET` | `/vouchers` | Listar con filtros y paginación |
| `GET` | `/vouchers/insights` | Obtener métricas y analytics |
| `GET` | `/vouchers/:id` | Obtener comprobante específico |
| `PATCH` | `/vouchers/:id` | Corregir campos manualmente |

El `ApiService` centraliza todas las llamadas y desenvuelve automáticamente el wrapper `{ success, data, timestamp }` que devuelve el backend, exponiendo solo `data` al resto de la aplicación.