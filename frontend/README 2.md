# BioestadisticaApp

Aplicación de análisis bioestadístico con arquitectura desacoplada: **Backend FastAPI** + **Frontend React**

## Estructura del Proyecto

```
BioestadisticaApp/
├── backend/              # FastAPI Backend
│   ├── main.py          # Aplicación principal
│   ├── routers/         # Módulos de API
│   │   ├── auth.py
│   │   ├── upload.py
│   │   ├── descriptiva.py
│   │   ├── inferencia.py
│   │   ├── multivariado.py
│   │   ├── survival.py
│   │   ├── psicometria.py
│   │   ├── asociaciones.py
│   │   ├── concordancia.py
│   │   └── diagnostico.py
│   └── requirements.txt
│
└── frontend/            # React + Vite Frontend
    ├── src/
    │   ├── api/        # Cliente API
    │   ├── context/    # State Management (DataContext)
    │   ├── pages/      # Componentes de página
    │   ├── App.tsx     # Routing
    │   └── main.tsx    # Entry point
    ├── package.json
    └── vite.config.ts
```

## Instalación y Ejecución

### Backend (FastAPI)

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor
python main.py
# O con uvicorn directamente:
# uvicorn main:app --reload
```

El backend estará disponible en: `http://localhost:8000`
Documentación Swagger: `http://localhost:8000/docs`

### Frontend (React + Vite)

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

El frontend estará disponible en: `http://localhost:5173`

## Características Principales

### Backend
- ✅ **10 routers modulares** organizados por funcionalidad
- ✅ **Gestión de sesiones** en memoria para DataFrames
- ✅ **CORS configurado** para desarrollo
- ✅ **Endpoints implementados** con Pandas, SciPy, scikit-learn
- ✅ **Documentación automática** con Swagger

### Frontend
- ✅ **React Router** para navegación entre módulos
- ✅ **DataContext** para state management global (reemplaza `st.session_state`)
- ✅ **API Client** organizado por módulos
- ✅ **Persistencia** en localStorage del sessionId
- ✅ **Diseño moderno** con CSS profesional

## Módulos Disponibles

| Módulo | Descripción | Endpoint Backend |
|--------|-------------|------------------|
| **Upload** | Carga de CSV/Excel | `/api/upload/` |
| **Descriptiva** | Estadísticas descriptivas | `/api/descriptiva/stats` |
| **Inferencia** | Tests de hipótesis | `/api/inferencia/t-test` |
| **Multivariado** | PCA, Clustering | `/api/multivariado/pca` |
| **Survival** | Kaplan-Meier, Cox | `/api/survival/kaplan-meier` |
| **Psicometría** | Cronbach, Factorial | `/api/psicometria/cronbach-alpha` |
| **Asociaciones** | Correlaciones | `/api/asociaciones/correlation-test` |
| **Concordancia** | Kappa, ICC | `/api/concordancia/cohen-kappa` |
| **Diagnóstico** | ROC, Métricas | `/api/diagnostico/roc-curve` |

## Flujo de Trabajo

1. **Cargar datos**: Usuario sube CSV/Excel en `/upload`
2. **Backend procesa**: Crea `session_id` y almacena DataFrame
3. **Frontend guarda**: `sessionId` y `metadata` en DataContext
4. **Análisis**: Otros módulos usan `sessionId` para análisis
5. **Resultados**: Backend retorna JSON con estadísticas/gráficos

## Próximos Pasos

- [ ] Implementar lógica completa en páginas placeholder
- [ ] Agregar visualizaciones (gráficos con Chart.js o Recharts)
- [ ] Implementar persistencia real (Redis/PostgreSQL)
- [ ] Agregar autenticación JWT
- [ ] Tests unitarios y de integración

## Tecnologías

**Backend:**
- FastAPI 0.109
- Pandas 2.2
- SciPy 1.12
- scikit-learn 1.4
- lifelines 0.28 (survival analysis)

**Frontend:**
- React 18.2
- TypeScript 5.3
- Vite 5.0
- React Router 6.21

---

**Autor:** Arquitecto de Software Senior  
**Fecha:** Diciembre 2025
