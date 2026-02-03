"""
Pydantic schemas for statistical analysis operations.
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, validator

from app.schemas.base import BaseResponse


# =============================================================================
# TABLA INTELIGENTE - Estructura Anidada en 4 Categorías
# =============================================================================

class CentralTendencyStats(BaseModel):
    """Estadísticas de tendencia central para Tabla Inteligente."""
    
    mean: Optional[float] = Field(None, description="Media aritmética")
    median: Optional[float] = Field(None, description="Mediana (percentil 50)")
    mode: Optional[Union[float, List[float]]] = Field(None, description="Moda (puede ser múltiple)")
    trimmed_mean_5: Optional[float] = Field(None, description="Media recortada al 5%")
    sum: Optional[float] = Field(None, description="Suma total de todos los valores")
    geometric_mean: Optional[float] = Field(
        None, 
        description="Media geométrica (solo definida para valores > 0)"
    )


class DispersionStats(BaseModel):
    """Estadísticas de dispersión para Tabla Inteligente."""
    
    std_dev: Optional[float] = Field(None, description="Desviación estándar (ddof=1)")
    variance: Optional[float] = Field(None, description="Varianza muestral")
    min: Optional[float] = Field(None, description="Valor mínimo")
    max: Optional[float] = Field(None, description="Valor máximo")
    range: Optional[float] = Field(None, description="Rango/Recorrido (max - min)")
    iqr: Optional[float] = Field(None, description="Rango intercuartílico (Q3 - Q1)")
    cv: Optional[float] = Field(None, description="Coeficiente de variación (%)")
    sem: Optional[float] = Field(None, description="Error estándar de la media (crucial para medicina)")


class PercentileStats(BaseModel):
    """Estadísticas de percentiles para Tabla Inteligente."""
    
    q1: Optional[float] = Field(None, description="Primer cuartil (25%)")
    q3: Optional[float] = Field(None, description="Tercer cuartil (75%)")
    p5: Optional[float] = Field(None, description="Percentil 5")
    p95: Optional[float] = Field(None, description="Percentil 95")
    deciles: Optional[Dict[str, float]] = Field(
        None, 
        description="Deciles: {'10': valor, '20': valor, ..., '90': valor}"
    )


class ShapeStats(BaseModel):
    """Estadísticas de forma de distribución para Tabla Inteligente."""
    
    skewness: Optional[float] = Field(None, description="Asimetría (bias=False, estimador insesgado)")
    kurtosis: Optional[float] = Field(None, description="Curtosis (bias=False, estimador insesgado)")
    normality_test: str = Field(
        "Indeterminado", 
        description="Interpretación simple: 'Normal' o 'No Normal' basado en test apropiado"
    )
    normality_p_value: Optional[float] = Field(None, description="P-valor del test de normalidad")
    test_used: Optional[str] = Field(
        None, 
        description="Test usado: 'Shapiro-Wilk' si n<50, 'Kolmogorov-Smirnov' si n>=50"
    )


class SmartTableColumnStats(BaseModel):
    """Estadísticas completas para una columna en estructura anidada de 4 categorías."""
    
    variable: str = Field(..., description="Nombre de la columna analizada")
    n: int = Field(..., description="Número de observaciones válidas (no nulas)")
    missing: int = Field(0, description="Número de valores faltantes")
    
    central_tendency: CentralTendencyStats = Field(..., description="Estadísticas de tendencia central")
    dispersion: DispersionStats = Field(..., description="Estadísticas de dispersión")
    percentiles: PercentileStats = Field(..., description="Estadísticas de percentiles")
    shape: ShapeStats = Field(..., description="Estadísticas de forma de la distribución")
    custom_percentiles_data: Dict[str, float] = Field(
        default={}, 
        description="Valores de percentiles personalizados calculados (e.g., {'P99': 140.5})"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "variable": "glucose",
                "n": 100,
                "missing": 5,
                "central_tendency": {
                    "mean": 95.5,
                    "median": 92.0,
                    "mode": 90.0,
                    "trimmed_mean_5": 94.2
                },
                "dispersion": {
                    "std_dev": 15.3,
                    "variance": 234.09,
                    "range": 80.0,
                    "iqr": 20.0,
                    "cv": 16.02,
                    "sem": 1.53
                },
                "percentiles": {
                    "q1": 85.0,
                    "q3": 105.0,
                    "p5": 70.0,
                    "p95": 125.0,
                    "deciles": {"10": 75.0, "20": 80.0, "30": 85.0, "40": 88.0, "50": 92.0, "60": 96.0, "70": 100.0, "80": 108.0, "90": 118.0}
                },
                "shape": {
                    "skewness": 0.45,
                    "kurtosis": -0.12,
                    "normality_test": "Normal",
                    "normality_p_value": 0.234,
                    "test_used": "Shapiro-Wilk"
                }
            }
        }


class SmartTableRequest(BaseModel):
    """Request para cálculo de estadísticas de Tabla Inteligente."""
    
    session_id: str = Field(..., description="Session ID del dataset cargado")
    columns: Optional[List[str]] = Field(
        None, 
        description="Columnas numéricas a analizar. Si es None, analiza todas las numéricas."
    )
    custom_percentiles: List[float] = Field(
        default=[],
        description="Lista de percentiles personalizados solicitados (0-100)"
    )
    group_by: Optional[str] = Field(
        None,
        description="Columna categórica para segmentar los resultados (ej: 'sexo', 'grupo_tratamiento')"
    )
    
    @validator('session_id')
    def validate_session_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("session_id cannot be empty")
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "columns": ["age", "glucose", "bmi"],
                "custom_percentiles": [2.5, 99],
                "group_by": "gender"
            }
        }


class SmartTableResponse(BaseResponse):
    """Response del endpoint Tabla Inteligente con estructura anidada en 4 categorías y soporte de segmentación."""
    
    session_id: str = Field(..., description="Session ID del dataset analizado")
    analyzed_columns: List[str] = Field(..., description="Lista de columnas que fueron analizadas")
    segments: List[str] = Field(
        ...,
        description="Lista de segmentos (ej: ['General'] o ['Hombres', 'Mujeres'])"
    )
    group_by: Optional[str] = Field(
        None,
        description="Variable usada para segmentar (None si no hay segmentación)"
    )
    statistics: Dict[str, Dict[str, SmartTableColumnStats]] = Field(
        ..., 
        description="Estadísticas por columna y segmento: {variable: {segmento: stats}}"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Smart Table statistics calculated successfully",
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "analyzed_columns": ["glucose"],
                "segments": ["General", "Male", "Female"],
                "group_by": "gender",
                "statistics": {
                    "glucose": {
                        "General": {
                            "variable": "glucose",
                            "n": 100,
                            "missing": 5,
                            "central_tendency": {"mean": 95.5, "median": 92.0, "mode": 90.0, "trimmed_mean_5": 94.2},
                            "dispersion": {"std_dev": 15.3, "variance": 234.09, "range": 80.0, "iqr": 20.0, "cv": 16.02, "sem": 1.53},
                            "percentiles": {"q1": 85.0, "q3": 105.0, "p5": 70.0, "p95": 125.0, "deciles": {}},
                            "shape": {"skewness": 0.45, "kurtosis": -0.12, "normality_test": "Normal", "normality_p_value": 0.234, "test_used": "Shapiro-Wilk"}
                        },
                        "Male": {
                            "variable": "glucose",
                            "n": 55,
                            "missing": 2,
                            "central_tendency": {"mean": 98.2, "median": 95.0},
                            "dispersion": {"std_dev": 16.1},
                            "percentiles": {"q1": 87.0, "q3": 108.0},
                            "shape": {"normality_test": "Normal"}
                        }
                    }
                }
            }
        }


# =============================================================================
# NUEVOS MODELOS AVANZADOS (Legacy)
# =============================================================================

class NormalityTest(BaseModel):
    """Resultados de pruebas de normalidad."""
    
    shapiro_statistic: Optional[float] = Field(None, description="Estadístico Shapiro-Wilk")
    shapiro_p_value: Optional[float] = Field(None, description="P-valor Shapiro-Wilk")
    kolmogorov_statistic: Optional[float] = Field(None, description="Estadístico Kolmogorov-Smirnov")
    kolmogorov_p_value: Optional[float] = Field(None, description="P-valor Kolmogorov-Smirnov")
    anderson_statistic: Optional[float] = Field(None, description="Estadístico Anderson-Darling")
    anderson_critical_values: Optional[List[float]] = Field(None, description="Valores críticos Anderson")
    conclusion: str = Field(..., description="Conclusión: 'Normal', 'No Normal', 'Indeterminado'")
    interpretation: str = Field(..., description="Interpretación textual del resultado")


class OutlierAnalysis(BaseModel):
    """Análisis de valores atípicos (outliers)."""
    
    iqr_outliers_count: int = Field(..., description="Cantidad de outliers por método IQR")
    iqr_outliers_indices: List[int] = Field(default_factory=list, description="Índices de outliers IQR")
    zscore_outliers_count: int = Field(..., description="Cantidad de outliers por Z-Score")
    zscore_outliers_indices: List[int] = Field(default_factory=list, description="Índices de outliers Z-Score")
    mad_outliers_count: int = Field(..., description="Cantidad de outliers por MAD")
    mad_outliers_indices: List[int] = Field(default_factory=list, description="Índices de outliers MAD")
    iqr_lower_bound: Optional[float] = Field(None, description="Límite inferior IQR")
    iqr_upper_bound: Optional[float] = Field(None, description="Límite superior IQR")


class ConfidenceInterval(BaseModel):
    """Intervalo de confianza al 95%."""
    
    lower: float = Field(..., description="Límite inferior")
    upper: float = Field(..., description="Límite superior")
    confidence_level: float = Field(0.95, description="Nivel de confianza")


class GroupStatistics(BaseModel):
    """Estadísticas descriptivas para un grupo específico."""
    
    n: int = Field(..., description="Tamaño de la muestra")
    mean_sd: str = Field(..., description="Media ± Desviación Estándar (formato: '45.2 ± 12.3')")
    median_iqr: str = Field(..., description="Mediana (IQR) (formato: '44.0 (35.0-56.0)')")
    min_max: str = Field(..., description="Rango (formato: '18.0 - 75.0')")


class Table1Row(BaseModel):
    """Fila de la Tabla 1 comparativa entre grupos."""
    
    variable: str = Field(..., description="Nombre de la variable")
    total: Optional[str] = Field(None, description="Estadística total (opcional)")
    groups: Dict[str, str] = Field(..., description="Estadísticas por grupo {'Control': '45.2 ± 12.3', ...}")
    p_value: str = Field(..., description="P-valor formateado ('0.042', '<0.001', '-')")
    test_used: str = Field(..., description="Test estadístico usado ('T-Student', 'Mann-Whitney', etc.)")
    is_significant: bool = Field(..., description="True si p < 0.05")


class SummaryStatRow(BaseModel):
    """Fila para la Tabla Resumen de estadística descriptiva."""

    variable: str = Field(..., description="Nombre de la variable")
    n: int = Field(..., description="Cantidad de observaciones no nulas")
    media: Optional[float] = Field(None, description="Media (o prevalencia para binarias)")
    mediana: Optional[float] = Field(None, description="Mediana")
    desvio_estandar: Optional[float] = Field(None, description="Desvío estándar")
    minimo: Optional[float] = Field(None, description="Mínimo")
    maximo: Optional[float] = Field(None, description="Máximo")
    q1: Optional[float] = Field(None, description="Primer cuartil (25%)")
    q3: Optional[float] = Field(None, description="Tercer cuartil (75%)")
    is_binary: bool = Field(default=False, description="True si es variable binaria (Si/No)")
    is_normal: Optional[bool] = Field(None, description="True si pasa test Shapiro-Wilk (p > 0.05)")
    normality_p_value: Optional[float] = Field(None, description="P-value del test de normalidad Shapiro-Wilk")


# =============================================================================
# MODELOS ACTUALIZADOS
# =============================================================================

class DescriptiveStatsRequest(BaseModel):
    """Request model for descriptive statistics calculation."""
    
    session_id: str = Field(..., description="Session ID of the uploaded dataset")
    columns: Optional[List[str]] = Field(
        default=None,
        description="Specific columns to analyze. If None, all numeric columns are analyzed."
    )
    
    # NUEVO: Parámetro de agrupación
    group_by: Optional[str] = Field(
        default=None,
        description="Column name to group by and generate Table 1 comparison"
    )
    
    # NUEVO: Opciones de análisis
    include_normality: bool = Field(
        default=True,
        description="Include normality tests (Shapiro, KS, Anderson)"
    )
    include_outliers: bool = Field(
        default=True,
        description="Include outlier detection (IQR, Z-Score, MAD)"
    )
    include_ci: bool = Field(
        default=True,
        description="Include 95% confidence intervals"
    )

    # NUEVO: Percentiles personalizados
    custom_percentiles: List[float] = Field(
        default=[],
        description="List of custom percentiles requested (0-100)"
    )
    
    @validator('session_id')
    def validate_session_id(cls, v: str) -> str:
        """Ensure session_id is not empty."""
        if not v or not v.strip():
            raise ValueError("session_id cannot be empty")
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "columns": ["age", "bmi", "glucose"],
                "group_by": "treatment_group",
                "include_normality": True,
                "include_outliers": True,
                "include_ci": True
            }
        }


class SummaryStatsRequest(BaseModel):
    """Request model for summary statistics table."""

    session_id: str = Field(..., description="Session ID of the uploaded dataset")
    variables: List[str] = Field(..., description="List of variables to summarize")

    @validator('session_id')
    def validate_session_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("session_id cannot be empty")
        return v.strip()


class SummaryInsight(BaseModel):
    """Insight automático generado del análisis."""
    
    type: str = Field(..., description="Tipo: success, info, warning, error")
    title: str = Field(..., description="Título del insight")
    description: str = Field(..., description="Descripción detallada")


# =============================================================================
# FREQUENCY TABLES
# =============================================================================

class FrequencyRow(BaseModel):
    """Una fila de tabla de frecuencias."""
    
    categoria: str = Field(..., description="Nombre de la categoría")
    frecuencia: int = Field(..., description="Conteo de observaciones")
    porcentaje: float = Field(..., description="Porcentaje del total")
    porcentaje_acumulado: float = Field(..., description="Porcentaje acumulado")


class FrequencyTableResult(BaseModel):
    """Resultado de tabla de frecuencias para una variable."""
    
    variable: str = Field(..., description="Nombre de la variable analizada")
    rows: List[FrequencyRow] = Field(..., description="Filas de frecuencias")
    total: int = Field(..., description="Total de observaciones")


class FrequencyRequest(BaseModel):
    """Request para cálculo de frecuencias."""
    
    session_id: str = Field(..., description="Session ID del dataset")
    variables: List[str] = Field(..., description="Variables categóricas a analizar")
    segment_by: Optional[str] = Field(None, description="Variable opcional para segmentar resultados")


class FrequencyResponse(BaseResponse):
    """Response con tablas de frecuencias segmentadas."""
    
    session_id: str = Field(..., description="Session ID del dataset")
    segments: List[str] = Field(..., description="Lista de segmentos (ej: ['General', 'Masculino', 'Femenino'])")
    tables: Dict[str, List[FrequencyTableResult]] = Field(..., description="Tablas por segmento")
    segment_by: Optional[str] = Field(None, description="Variable usada para segmentar")


# =============================================================================
# CONTINGENCY TABLES (CROSSTAB)
# =============================================================================

class ContingencyCellData(BaseModel):
    """Datos de una celda en la tabla de contingencia."""
    
    count: int = Field(..., description="Frecuencia absoluta (N)")
    row_percent: float = Field(..., description="Porcentaje respecto al total de la fila")
    col_percent: float = Field(..., description="Porcentaje respecto al total de la columna")
    total_percent: float = Field(..., description="Porcentaje respecto al total global")
    
    class Config:
        json_schema_extra = {
            "example": {
                "count": 15,
                "row_percent": 25.0,
                "col_percent": 10.0,
                "total_percent": 5.0
            }
        }


class ContingencyTableRequest(BaseModel):
    """Request para tabla de contingencia (crosstab)."""
    
    session_id: str = Field(..., description="Session ID del dataset")
    row_variable: str = Field(..., description="Variable categórica para filas")
    col_variable: str = Field(..., description="Variable categórica para columnas")
    segment_by: Optional[str] = Field(None, description="Variable opcional para segmentar resultados")
    
    @validator('session_id')
    def validate_session_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("session_id cannot be empty")
        return v.strip()
    
    @validator('row_variable', 'col_variable')
    def validate_variables(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Variable name cannot be empty")
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "row_variable": "gender",
                "col_variable": "treatment_group",
                "segment_by": "age_group"
            }
        }


class ContingencyTableResult(BaseModel):
    """Resultado de tabla de contingencia para un segmento individual."""
    
    row_variable: str = Field(..., description="Variable usada para filas")
    col_variable: str = Field(..., description="Variable usada para columnas")
    row_categories: List[str] = Field(..., description="Categorías de la variable fila")
    col_categories: List[str] = Field(..., description="Categorías de la variable columna")
    cells: Dict[str, Dict[str, ContingencyCellData]] = Field(
        ..., 
        description="Datos de celdas organizados como {row_category: {col_category: CellData}}"
    )
    row_totals: Dict[str, ContingencyCellData] = Field(
        ..., 
        description="Totales marginales por fila"
    )
    col_totals: Dict[str, ContingencyCellData] = Field(
        ..., 
        description="Totales marginales por columna"
    )
    grand_total: int = Field(..., description="Total global (N)")


class ContingencyTableResponse(BaseResponse):
    """Response con tabla de contingencia completa (con soporte para segmentación)."""
    
    session_id: str = Field(..., description="Session ID del dataset")
    
    # Nuevos campos para segmentación
    segments: List[str] = Field(..., description="Lista de segmentos (ej: ['General'] o ['Masculino', 'Femenino'])")
    tables: Dict[str, ContingencyTableResult] = Field(..., description="Tablas por segmento")
    segment_by: Optional[str] = Field(None, description="Variable usada para segmentar")
    
    # Campos legacy (mantener para compatibilidad backward - contienen datos del primer segmento)
    row_variable: str = Field(..., description="Variable usada para filas")
    col_variable: str = Field(..., description="Variable usada para columnas")
    row_categories: List[str] = Field(..., description="Categorías de la variable fila")
    col_categories: List[str] = Field(..., description="Categorías de la variable columna")
    cells: Dict[str, Dict[str, ContingencyCellData]] = Field(
        ..., 
        description="Datos de celdas organizados como {row_category: {col_category: CellData}}"
    )
    row_totals: Dict[str, ContingencyCellData] = Field(
        ..., 
        description="Totales marginales por fila"
    )
    col_totals: Dict[str, ContingencyCellData] = Field(
        ..., 
        description="Totales marginales por columna"
    )
    grand_total: int = Field(..., description="Total global (N)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Contingency table calculated successfully",
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "row_variable": "gender",
                "col_variable": "treatment_group",
                "row_categories": ["Male", "Female"],
                "col_categories": ["Control", "Treatment"],
                "cells": {
                    "Male": {
                        "Control": {
                            "count": 25,
                            "row_percent": 50.0,
                            "col_percent": 45.45,
                            "total_percent": 25.0
                        },
                        "Treatment": {
                            "count": 25,
                            "row_percent": 50.0,
                            "col_percent": 54.55,
                            "total_percent": 25.0
                        }
                    },
                    "Female": {
                        "Control": {
                            "count": 30,
                            "row_percent": 60.0,
                            "col_percent": 54.55,
                            "total_percent": 30.0
                        },
                        "Treatment": {
                            "count": 20,
                            "row_percent": 40.0,
                            "col_percent": 45.45,
                            "total_percent": 20.0
                        }
                    }
                },
                "row_totals": {
                    "Male": {
                        "count": 50,
                        "row_percent": 100.0,
                        "col_percent": 50.0,
                        "total_percent": 50.0
                    },
                    "Female": {
                        "count": 50,
                        "row_percent": 100.0,
                        "col_percent": 50.0,
                        "total_percent": 50.0
                    }
                },
                "col_totals": {
                    "Control": {
                        "count": 55,
                        "row_percent": 55.0,
                        "col_percent": 100.0,
                        "total_percent": 55.0
                    },
                    "Treatment": {
                        "count": 45,
                        "row_percent": 45.0,
                        "col_percent": 100.0,
                        "total_percent": 45.0
                    }
                },
                "grand_total": 100
            }
        }


class SummaryStatsResponse(BaseResponse):
    """Response model for summary statistics table."""

    session_id: str = Field(..., description="Session ID of the analyzed dataset")
    data: List[SummaryStatRow] = Field(..., description="Summary statistics rows")
    analyzed_variables: List[str] = Field(..., description="Variables included in the summary")
    insights: List[SummaryInsight] = Field(default=[], description="Auto-generated insights")


class ColumnStatistics(BaseModel):
    """Statistical metrics for a single column."""
    
    # Campos básicos (existentes)
    count: int = Field(..., description="Number of non-null observations")
    missing: int = Field(..., description="Number of missing (null) values")
    mean: Optional[float] = Field(None, description="Arithmetic mean")
    median: Optional[float] = Field(None, description="Median (50th percentile)")
    std: Optional[float] = Field(None, description="Standard deviation")
    variance: Optional[float] = Field(None, description="Variance")
    min: Optional[float] = Field(None, description="Minimum value")
    max: Optional[float] = Field(None, description="Maximum value")
    q1: Optional[float] = Field(None, description="First quartile (25th percentile)")
    q3: Optional[float] = Field(None, description="Third quartile (75th percentile)")
    iqr: Optional[float] = Field(None, description="Interquartile range (Q3 - Q1)")
    skewness: Optional[float] = Field(None, description="Measure of asymmetry")
    kurtosis: Optional[float] = Field(None, description="Measure of tailedness")
    
    # NUEVOS campos avanzados
    sem: Optional[float] = Field(None, description="Standard error of the mean")
    cv: Optional[float] = Field(None, description="Coefficient of variation (%)")
    range: Optional[float] = Field(None, description="Range (max - min)")
    ci_95: Optional[ConfidenceInterval] = Field(None, description="95% confidence interval")
    
    # Métricas adicionales requeridas
    sum: Optional[float] = Field(None, description="Sum of all values")
    geometric_mean: Optional[float] = Field(
        None, 
        description="Geometric mean (only defined for positive values > 0)"
    )
    mode: Optional[Union[float, List[float]]] = Field(
        None, 
        description="Mode(s) - most frequent value(s). Can be single value or list if multimodal."
    )
    
    # Percentiles adicionales
    p5: Optional[float] = Field(None, description="5th percentile")
    p10: Optional[float] = Field(None, description="10th percentile")
    p90: Optional[float] = Field(None, description="90th percentile")
    p95: Optional[float] = Field(None, description="95th percentile")
    
    # Objetos Anidados
    normality: Optional[NormalityTest] = Field(None, description="Normality test results")
    outliers: Optional[OutlierAnalysis] = Field(None, description="Outlier detection results")
    
    # Percentiles personalizados dinámicos
    custom_percentiles_data: Dict[str, float] = Field(
        default={}, 
        description="Calculated values for requested custom percentiles (e.g., {'P99': 140.5})"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "count": 100,
                "missing": 5,
                "mean": 45.5,
                "median": 44.0,
                "std": 12.3,
                "variance": 151.29,
                "min": 18.0,
                "max": 75.0,
                "q1": 35.0,
                "q3": 56.0,
                "iqr": 21.0,
                "skewness": 0.12,
                "kurtosis": -0.45,
                "sem": 1.23,
                "cv": 27.03,
                "range": 57.0,
                "ci_95": {"lower": 43.1, "upper": 47.9, "confidence_level": 0.95},
                "sum": 4550.0,
                "geometric_mean": 42.8,
                "mode": 44.0,
                "p5": 22.5,
                "p10": 28.0,
                "p90": 63.0,
                "p95": 68.5,
                "normality": {
                    "shapiro_statistic": 0.987,
                    "shapiro_p_value": 0.432,
                    "conclusion": "Normal",
                    "interpretation": "Los datos siguen una distribución normal (p > 0.05)"
                },
                "outliers": {
                    "iqr_outliers_count": 3,
                    "iqr_outliers_indices": [12, 45, 78],
                    "zscore_outliers_count": 2,
                    "mad_outliers_count": 1,
                    "iqr_lower_bound": 3.5,
                    "iqr_upper_bound": 87.5
                }
            }
        }


class DescriptiveStatsResponse(BaseResponse):
    """Response model for descriptive statistics."""
    
    session_id: str = Field(..., description="Session ID of the analyzed dataset")
    statistics: Dict[str, ColumnStatistics] = Field(
        ...,
        description="Statistical metrics for each analyzed column"
    )
    analyzed_columns: List[str] = Field(..., description="List of columns that were analyzed")
    
    # NUEVOS campos para Tabla 1
    table1_data: Optional[List[Table1Row]] = Field(
        None,
        description="Table 1 comparative data between groups (only if group_by is provided)"
    )
    group_variable: Optional[str] = Field(None, description="Variable used for grouping")
    groups: Optional[List[str]] = Field(None, description="List of unique group names")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Descriptive statistics calculated successfully",
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "analyzed_columns": ["age", "bmi"],
                "statistics": {
                    "age": {
                        "count": 100,
                        "missing": 0,
                        "mean": 45.5,
                        "median": 44.0,
                        "std": 12.3,
                        # ... más campos
                    }
                },
                "table1_data": [
                    {
                        "variable": "age (Media ± DE)",
                        "groups": {
                            "Control (n=50)": "43.2 ± 11.5",
                            "Treatment (n=50)": "47.8 ± 13.1"
                        },
                        "p_value": "0.042",
                        "test_used": "T-Student",
                        "is_significant": True
                    }
                ],
                "group_variable": "treatment_group",
                "groups": ["Control", "Treatment"]
            }
        }


# =============================================================================
# CORRELATION ANALYSIS
# =============================================================================

class CorrelationPairData(BaseModel):
    """Datos de correlación para un par de variables."""
    
    r: Optional[float] = Field(None, description="Coeficiente de correlación")
    p_value: Optional[float] = Field(None, description="P-valor del test")
    n: Optional[int] = Field(None, description="Tamaño de muestra para este par")
    is_significant: bool = Field(False, description="True si p < 0.05")
    
    class Config:
        json_schema_extra = {
            "example": {
                "r": 0.854,
                "p_value": 0.000,
                "n": 5594,
                "is_significant": True
            }
        }


class CorrelationMatrixResult(BaseModel):
    """Matriz de correlación para un método y segmento específicos."""
    
    method: str = Field(..., description="Método usado: pearson, spearman, kendall")
    variables: List[str] = Field(..., description="Lista de variables en la matriz")
    matrix: Dict[str, Dict[str, CorrelationPairData]] = Field(
        ..., description="Matriz como {var1: {var2: CorrelationPairData}}"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "method": "pearson",
                "variables": ["age", "bmi"],
                "matrix": {
                    "age": {
                        "age": {"r": 1.0, "p_value": 0.0, "n": 100, "is_significant": False},
                        "bmi": {"r": 0.145, "p_value": 0.042, "n": 98, "is_significant": True}
                    },
                    "bmi": {
                        "age": {"r": 0.145, "p_value": 0.042, "n": 98, "is_significant": True},
                        "bmi": {"r": 1.0, "p_value": 0.0, "n": 100, "is_significant": False}
                    }
                }
            }
        }


class FilterRule(BaseModel):
    """Regla de filtrado para excluir filas del análisis."""
    
    column: str = Field(..., description="Nombre de la columna a filtrar")
    operator: str = Field(..., description="Operador de comparación: >, <, >=, <=, ==, !=")
    value: float = Field(..., description="Valor de comparación (numérico)")
    
    @validator('operator')
    def validate_operator(cls, v: str) -> str:
        """Validar que el operador sea válido."""
        valid_ops = ['>', '<', '>=', '<=', '==', '=', '!=', '≠', '≥', '≤']
        if v not in valid_ops:
            raise ValueError(f"Operador inválido: {v}. Use uno de: {', '.join(valid_ops)}")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "column": "age",
                "operator": ">",
                "value": 30
            }
        }


class CorrelationRequest(BaseModel):
    """Request para cálculo de correlaciones."""
    
    session_id: str = Field(..., description="Session ID del dataset")
    columns: List[str] = Field(..., description="Variables numéricas a correlacionar (mín. 2)")
    methods: List[str] = Field(
        default=["pearson"], 
        description="Métodos: 'pearson', 'spearman', 'kendall'"
    )
    group_by: Optional[str] = Field(None, description="Variable para segmentar resultados")
    filters: List[FilterRule] = Field(default=[], description="Reglas de filtrado opcionales")
    filter_logic: str = Field(default='AND', description="Lógica de combinación: 'AND' o 'OR'")
    
    @validator('filter_logic')
    def validate_filter_logic(cls, v: str) -> str:
        if v.upper() not in ['AND', 'OR']:
            raise ValueError("filter_logic debe ser 'AND' o 'OR'")
        return v.upper()
    
    @validator('session_id')
    def validate_session_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("session_id cannot be empty")
        return v.strip()
    
    @validator('columns')
    def validate_min_columns(cls, v: List[str]) -> List[str]:
        if len(v) < 2:
            raise ValueError("Se requieren al menos 2 variables para correlacionar")
        return v
    
    @validator('methods')
    def validate_methods(cls, v: List[str]) -> List[str]:
        valid = ['pearson', 'spearman', 'kendall', 'all', 'comparar_todos']
        for method in v:
            if method not in valid:
                raise ValueError(f"Método inválido: {method}. Use: {', '.join(valid)}")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "columns": ["age", "bmi", "glucose"],
                "methods": ["pearson", "spearman"],
                "group_by": "gender",
                "filters": [
                    {"column": "age", "operator": ">", "value": 30},
                    {"column": "bmi", "operator": "<", "value": 35}
                ],
                "filter_logic": "AND"
            }
        }


class CorrelationResponse(BaseResponse):
    """Response con matrices de correlación."""
    
    session_id: str = Field(..., description="Session ID del dataset")
    segments: List[str] = Field(..., description="Segmentos analizados")
    tables: Dict[str, Dict[str, CorrelationMatrixResult]] = Field(
        ..., description="Matrices por segmento y método: {segment: {method: matrix}}"
    )
    segment_by: Optional[str] = Field(None, description="Variable de segmentación")
    analyzed_columns: List[str] = Field(..., description="Columnas incluidas en el análisis")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Correlation matrices calculated for 3 variables using 2 method(s)",
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "segments": ["General"],
                "tables": {
                    "General": {
                        "pearson": {
                            "method": "pearson",
                            "variables": ["age", "bmi"],
                            "matrix": {}
                        }
                    }
                },
                "segment_by": None,
                "analyzed_columns": ["age", "bmi", "glucose"]
            }
        }

