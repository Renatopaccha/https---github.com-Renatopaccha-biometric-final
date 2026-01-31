"""
DescriptiveService: Statistical calculations for descriptive analysis.
Implements mathematical operations using core.py statistical engine.
"""

from typing import Dict, List, Optional, Any, Tuple, Union
import pandas as pd
import numpy as np
from scipy.stats import shapiro, kstest, trim_mean, skew, kurtosis, gmean
import math

from app.core.errors import InvalidColumnError, NonNumericColumnError
from app.schemas.stats import (
    ColumnStatistics, 
    NormalityTest, 
    OutlierAnalysis, 
    ConfidenceInterval,
    Table1Row,
    # Nuevos schemas para Tabla Inteligente
    CentralTendencyStats,
    DispersionStats,
    PercentileStats,
    ShapeStats,
    SmartTableColumnStats
)

# Importar funciones del motor estadístico core.py
from app.internal.stats.core import (
    calculate_descriptive_stats as core_calc_stats,
    check_normality,
    detect_outliers_advanced,
    calculate_group_comparison,
    generate_table_one_structure
)


def _safe_float(value: Any) -> Optional[float]:
    """
    Convierte un valor a float de forma segura para JSON.
    Convierte NaN e Infinity a None para evitar errores de serialización.
    
    Args:
        value: Valor a convertir (puede ser float, int, np.float64, etc.)
        
    Returns:
        float válido o None si el valor no es serializable
    """
    if value is None:
        return None
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 6)  # Redondear a 6 decimales para precisión científica
    except (TypeError, ValueError):
        return None


def _calculate_geometric_mean(series: pd.Series) -> Optional[float]:
    """
    Calcula la media geométrica de una serie.
    
    Validación Crítica: La media geométrica solo está definida para valores
    estrictamente positivos (> 0). Para datos biomédicos con ceros o valores
    negativos (ej: log-transformaciones, cambios relativos), devuelve None.
    
    Args:
        series: Serie de Pandas con datos numéricos (ya sin NaN)
        
    Returns:
        Media geométrica como float, o None si:
        - La serie está vacía
        - Hay valores <= 0
        - El cálculo falla
    """
    if len(series) == 0:
        return None
    
    # Validación crítica: todos los valores deben ser > 0
    if (series <= 0).any():
        return None
    
    try:
        gm = gmean(series.values)
        return _safe_float(gm)
    except Exception:
        return None


def _calculate_mode(series: pd.Series) -> Optional[Union[float, List[float]]]:
    """
    Calcula la moda de una serie numérica.
    
    Maneja distribuciones unimodales y multimodales:
    - Si hay una única moda, devuelve un float
    - Si hay múltiples modas, devuelve una lista de floats
    - Si no hay moda clara (todos los valores únicos), devuelve None
    
    Args:
        series: Serie de Pandas con datos numéricos (ya sin NaN)
        
    Returns:
        - float: Si hay una moda única
        - List[float]: Si hay múltiples modas
        - None: Si no hay moda o la serie está vacía
    """
    if len(series) == 0:
        return None
    
    try:
        # value_counts() cuenta frecuencias de cada valor
        counts = series.value_counts()
        
        if len(counts) == 0:
            return None
        
        # El valor máximo de frecuencia
        max_count = counts.iloc[0]
        
        # Si todos los valores aparecen solo una vez, no hay moda
        if max_count == 1:
            return None
        
        # Encontrar todos los valores con la frecuencia máxima
        modes = counts[counts == max_count].index.tolist()
        
        if len(modes) == 1:
            return _safe_float(modes[0])
        else:
            # Devolver lista de modas (ordenada de menor a mayor)
            return [_safe_float(m) for m in sorted(modes) if _safe_float(m) is not None]
    except Exception:
        return None


def calculate_smart_table_stats(
    df: pd.DataFrame, 
    columns: Optional[List[str]] = None
) -> Dict[str, SmartTableColumnStats]:
    """
    Calcula estadísticas descriptivas avanzadas en estructura anidada de 4 categorías.
    
    Esta función implementa el módulo "Tabla Inteligente" con rigor científico
    para usuarios del área de la salud.
    
    Categorías:
        1. central_tendency: media, mediana, moda, media recortada 5%
        2. dispersion: std, varianza, rango, IQR, CV%, SEM
        3. percentiles: Q1, Q3, P5, P95, deciles
        4. shape: asimetría, curtosis, test normalidad
    
    Args:
        df: DataFrame con datos a analizar
        columns: Lista de columnas numéricas. Si None, analiza todas las numéricas.
        
    Returns:
        Dict[str, SmartTableColumnStats]: Estadísticas por columna
        
    Raises:
        InvalidColumnError: Si una columna especificada no existe
        NonNumericColumnError: Si una columna no es numérica
    """
    results: Dict[str, SmartTableColumnStats] = {}
    
    # Determinar columnas a analizar
    if columns is None:
        target_columns = df.select_dtypes(include=[np.number]).columns.tolist()
    else:
        for col in columns:
            if col not in df.columns:
                raise InvalidColumnError(col, df.columns.tolist())
        target_columns = columns
    
    for col in target_columns:
        series = df[col]
        
        # Validar que sea numérico (intentar conversión si no lo es)
        if not pd.api.types.is_numeric_dtype(series):
            try:
                series = pd.to_numeric(series, errors='coerce')
            except Exception:
                raise NonNumericColumnError(col)
        
        clean = series.dropna()
        n = len(clean)
        missing = int(series.isna().sum())
        
        # Si no hay datos válidos, retornar estadísticas vacías
        if n == 0:
            results[col] = SmartTableColumnStats(
                variable=col,
                n=0,
                missing=missing,
                central_tendency=CentralTendencyStats(),
                dispersion=DispersionStats(),
                percentiles=PercentileStats(),
                shape=ShapeStats(normality_test="Indeterminado")
            )
            continue
        
        # =====================================================================
        # 1. TENDENCIA CENTRAL
        # =====================================================================
        mean_val = _safe_float(clean.mean())
        median_val = _safe_float(clean.median())
        
        # Moda: puede ser múltiple
        mode_result = clean.mode()
        if len(mode_result) == 0:
            mode_val = None
        elif len(mode_result) == 1:
            mode_val = _safe_float(mode_result.iloc[0])
        else:
            # Múltiples modas
            mode_val = [_safe_float(m) for m in mode_result.tolist()]
        
        # Media recortada al 5% (elimina 5% extremos de cada lado)
        trimmed_mean_val = None
        if n >= 3:
            try:
                trimmed_mean_val = _safe_float(trim_mean(clean, proportiontocut=0.05))
            except Exception:
                pass
        
        # Suma total
        sum_val = _safe_float(clean.sum())
        
        # Media geométrica (solo para valores > 0)
        geometric_mean_val = _calculate_geometric_mean(clean)
        
        central_tendency = CentralTendencyStats(
            mean=mean_val,
            median=median_val,
            mode=mode_val,
            trimmed_mean_5=trimmed_mean_val,
            sum=sum_val,
            geometric_mean=geometric_mean_val
        )
        
        # =====================================================================
        # 2. DISPERSIÓN
        # =====================================================================
        std_val = _safe_float(clean.std(ddof=1)) if n > 1 else None
        variance_val = _safe_float(clean.var(ddof=1)) if n > 1 else None
        
        # Mínimo y Máximo
        min_val = _safe_float(clean.min()) if n > 0 else None
        max_val = _safe_float(clean.max()) if n > 0 else None
        
        # Recorrido/Rango: Max - Min (solo si ambos son válidos)
        range_val = None
        if min_val is not None and max_val is not None:
            range_val = _safe_float(max_val - min_val)
        
        q1 = _safe_float(clean.quantile(0.25)) if n > 0 else None
        q3 = _safe_float(clean.quantile(0.75)) if n > 0 else None
        iqr_val = _safe_float(q3 - q1) if q1 is not None and q3 is not None else None
        
        # Coeficiente de variación (CV%): (std / mean) * 100
        cv_val = None
        if std_val is not None and mean_val is not None and mean_val != 0:
            cv_val = _safe_float((std_val / abs(mean_val)) * 100)
        
        # Error Estándar de la Media (SEM): std / sqrt(n) - CRUCIAL PARA MEDICINA
        sem_val = None
        if std_val is not None and n > 0:
            sem_val = _safe_float(std_val / np.sqrt(n))
        
        dispersion = DispersionStats(
            std_dev=std_val,
            variance=variance_val,
            min=min_val,
            max=max_val,
            range=range_val,
            iqr=iqr_val,
            cv=cv_val,
            sem=sem_val
        )
        
        # =====================================================================
        # 3. PERCENTILES
        # =====================================================================
        p5 = _safe_float(clean.quantile(0.05)) if n > 0 else None
        p95 = _safe_float(clean.quantile(0.95)) if n > 0 else None
        
        # Deciles (10, 20, 30, ..., 90)
        deciles: Optional[Dict[str, float]] = None
        if n >= 10:
            deciles = {}
            for d in range(10, 100, 10):
                decile_val = _safe_float(clean.quantile(d / 100))
                if decile_val is not None:
                    deciles[str(d)] = decile_val
        
        percentiles_stats = PercentileStats(
            q1=q1,
            q3=q3,
            p5=p5,
            p95=p95,
            deciles=deciles
        )
        
        # =====================================================================
        # 4. FORMA DE LA DISTRIBUCIÓN
        # =====================================================================
        # Asimetría y Curtosis con bias=False (estimadores INSESGADOS para muestras clínicas)
        skewness_val = None
        kurtosis_val = None
        
        if n >= 3:
            try:
                # bias=False usa estimador de Fisher (insesgado)
                skewness_val = _safe_float(skew(clean, bias=False))
                kurtosis_val = _safe_float(kurtosis(clean, bias=False))
            except Exception:
                pass
        
        # Test de Normalidad:
        # - Shapiro-Wilk si n < 50 (más potente para muestras pequeñas)
        # - Kolmogorov-Smirnov si n >= 50 (mejor para muestras grandes)
        normality_result = "Indeterminado"
        normality_p = None
        test_used = None
        
        if n >= 3:
            try:
                if n < 50:
                    # Shapiro-Wilk (límite de 5000, pero usamos para n < 50)
                    stat, p_value = shapiro(clean)
                    normality_p = _safe_float(p_value)
                    test_used = "Shapiro-Wilk"
                else:
                    # Kolmogorov-Smirnov para n >= 50
                    # Normalizar datos para el test
                    mean_test = clean.mean()
                    std_test = clean.std(ddof=1)
                    if std_test > 0:
                        normalized = (clean - mean_test) / std_test
                        stat, p_value = kstest(normalized, 'norm')
                        normality_p = _safe_float(p_value)
                        test_used = "Kolmogorov-Smirnov"
                
                if normality_p is not None:
                    normality_result = "Normal" if normality_p > 0.05 else "No Normal"
            except Exception as e:
                print(f"Warning: Normality test failed for {col}: {e}")
        
        shape_stats = ShapeStats(
            skewness=skewness_val,
            kurtosis=kurtosis_val,
            normality_test=normality_result,
            normality_p_value=normality_p,
            test_used=test_used
        )
        
        # =====================================================================
        # CONSTRUIR RESULTADO FINAL
        # =====================================================================
        results[col] = SmartTableColumnStats(
            variable=col,
            n=n,
            missing=missing,
            central_tendency=central_tendency,
            dispersion=dispersion,
            percentiles=percentiles_stats,
            shape=shape_stats
        )
    
    return results


def _is_binary_categorical(series: pd.Series) -> Tuple[bool, Optional[pd.Series]]:
    """
    Detecta si una columna es categórica binaria (Si/No, Yes/No, True/False, etc.)
    y la convierte a 0/1 si lo es.
    
    Returns:
        Tuple[bool, Optional[pd.Series]]: (es_binaria, serie_convertida)
    """
    # Valores que representan "positivo" (se mapearán a 1)
    POSITIVE_VALUES = {'si', 'sí', 'yes', 'true', 'positivo', 'positive', '1', 'v', 'verdadero'}
    # Valores que representan "negativo" (se mapearán a 0)
    NEGATIVE_VALUES = {'no', 'false', 'negativo', 'negative', '0', 'f', 'falso'}
    
    if series.dtype != 'object':
        return False, None
    
    # Limpiar y normalizar valores
    cleaned = series.astype(str).str.strip().str.lower()
    unique_values = set(cleaned.dropna().unique()) - {'nan', ''}
    
    # Debe tener exactamente 2 valores únicos
    if len(unique_values) != 2:
        return False, None
    
    # Verificar si los valores son positivo/negativo reconocibles
    has_positive = bool(unique_values & POSITIVE_VALUES)
    has_negative = bool(unique_values & NEGATIVE_VALUES)
    
    if not (has_positive and has_negative):
        return False, None
    
    # Convertir a 0/1
    def map_to_binary(val):
        if pd.isna(val):
            return np.nan
        val_lower = str(val).strip().lower()
        if val_lower in POSITIVE_VALUES:
            return 1
        elif val_lower in NEGATIVE_VALUES:
            return 0
        return np.nan
    
    converted = series.apply(map_to_binary)
    return True, converted


def calculate_summary_stats(df: pd.DataFrame, variables: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Calcula estadísticas descriptivas para columnas numéricas y binarias.
    
    LÓGICA AGRESIVA: 
    - Intenta convertir CUALQUIER columna a numérico
    - Detecta columnas binarias (Si/No) y las convierte a 0/1 para calcular prevalencia
    - Si tiene al menos 1 valor numérico válido, la incluye en los resultados
    """
    results: List[Dict[str, Any]] = []
    
    # Diccionario para trackear qué columnas son binarias
    binary_columns: Dict[str, pd.Series] = {}

    # Si variables está vacío o None, detectar automáticamente columnas
    if not variables:
        detected_cols: List[str] = []
        
        for col in df.columns:
            series = df[col]
            
            # Primero: verificar si es binaria categórica (Si/No, etc.)
            is_binary, converted = _is_binary_categorical(series)
            if is_binary and converted is not None:
                binary_columns[col] = converted
                detected_cols.append(col)
                continue
            
            # Segundo: intentar conversión numérica agresiva
            if series.dtype == 'object':
                series = series.astype(str).str.strip()
            
            converted_numeric = pd.to_numeric(series, errors='coerce')
            valid_count = converted_numeric.notna().sum()
            
            if valid_count >= 1:
                detected_cols.append(col)
        
        variables = detected_cols

    for var in variables:
        if var not in df.columns:
            raise InvalidColumnError(var, df.columns.tolist())

        is_binary = var in binary_columns
        
        if is_binary:
            # Usar la serie ya convertida a 0/1
            numeric = binary_columns[var]
            clean = numeric.dropna()
        else:
            # Verificar si es binaria (por si se pasó manualmente)
            is_bin, converted = _is_binary_categorical(df[var])
            if is_bin and converted is not None:
                is_binary = True
                numeric = converted
                clean = numeric.dropna()
            else:
                # Conversión numérica normal
                series = df[var]
                if series.dtype == 'object':
                    series = series.astype(str).str.strip()
                    series = series.replace('', np.nan)
                
                numeric = pd.to_numeric(series, errors="coerce")
                clean = numeric.dropna()

        if clean.shape[0] == 0:
            results.append({
                "variable": var,
                "n": 0,
                "media": None,
                "mediana": None,
                "desvio_estandar": None,
                "minimo": None,
                "maximo": None,
                "q1": None,
                "q3": None,
                "is_binary": is_binary,
                "is_normal": None,
                "normality_p_value": None,
            })
            continue

        mean_val = float(clean.mean()) if not np.isnan(clean.mean()) else None
        median_val = float(clean.median()) if not np.isnan(clean.median()) else None
        std_val = float(clean.std(ddof=1)) if clean.shape[0] > 1 and not np.isnan(clean.std(ddof=1)) else None
        min_val = float(clean.min()) if not np.isnan(clean.min()) else None
        max_val = float(clean.max()) if not np.isnan(clean.max()) else None
        q1_val = float(clean.quantile(0.25)) if clean.shape[0] > 0 else None
        q3_val = float(clean.quantile(0.75)) if clean.shape[0] > 0 else None

        # Test de normalidad Shapiro-Wilk
        is_normal: Optional[bool] = None
        normality_p_value: Optional[float] = None
        
        if not is_binary and clean.shape[0] > 3:
            try:
                # Shapiro-Wilk tiene límite de 5000 muestras, usar sampleo si es mayor
                if clean.shape[0] > 5000:
                    sample = clean.sample(n=5000, random_state=42)
                else:
                    sample = clean
                
                stat, p_value = shapiro(sample)
                normality_p_value = float(p_value)
                is_normal = p_value > 0.05
            except Exception:
                # Si falla el test, dejamos None
                is_normal = None
                normality_p_value = None

        results.append({
            "variable": var,
            "n": int(clean.shape[0]),
            "media": mean_val,
            "mediana": median_val,
            "desvio_estandar": std_val,
            "minimo": min_val,
            "maximo": max_val,
            "q1": q1_val,
            "q3": q3_val,
            "is_binary": is_binary,
            "is_normal": is_normal,
            "normality_p_value": normality_p_value,
        })

    return results


def _calculate_frequency_for_series(series: pd.Series) -> Dict[str, Any]:
    """
    Calcula frecuencias para una serie individual.
    """
    value_counts = series.value_counts(dropna=True)
    missing_count = series.isna().sum()
    
    total = int(series.notna().sum())
    if missing_count > 0:
        total += int(missing_count)
    
    rows: List[Dict[str, Any]] = []
    cumulative_pct = 0.0
    
    for categoria, frecuencia in value_counts.items():
        frecuencia = int(frecuencia)
        porcentaje = (frecuencia / total * 100) if total > 0 else 0.0
        cumulative_pct += porcentaje
        
        rows.append({
            "categoria": str(categoria),
            "frecuencia": frecuencia,
            "porcentaje": round(porcentaje, 1),
            "porcentaje_acumulado": round(cumulative_pct, 1)
        })
    
    if missing_count > 0:
        porcentaje = (missing_count / total * 100) if total > 0 else 0.0
        cumulative_pct += porcentaje
        rows.append({
            "categoria": "(Perdidos)",
            "frecuencia": int(missing_count),
            "porcentaje": round(porcentaje, 1),
            "porcentaje_acumulado": round(cumulative_pct, 1)
        })
    
    return {"rows": rows, "total": total}


def calculate_frequency_stats(
    df: pd.DataFrame, 
    variables: List[str], 
    segment_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calcula tablas de frecuencia para variables categóricas, opcionalmente segmentadas.
    
    Args:
        df: DataFrame con los datos
        variables: Lista de nombres de columnas categóricas a analizar
        segment_by: Columna opcional para segmentar los resultados
        
    Returns:
        Diccionario con estructura:
        {
            "segments": ["General", "Masculino", "Femenino"],
            "tables": {
                "General": [FrequencyTableResult, ...],
                "Masculino": [FrequencyTableResult, ...],
                ...
            }
        }
    """
    # Validar columnas
    for var in variables:
        if var not in df.columns:
            raise InvalidColumnError(var, df.columns.tolist())
    
    if segment_by and segment_by not in df.columns:
        raise InvalidColumnError(segment_by, df.columns.tolist())
    
    # Determinar segmentos
    if segment_by:
        # Obtener valores únicos del segmento (excluyendo NaN)
        segment_values = df[segment_by].dropna().unique().tolist()
        segment_values = [str(v) for v in sorted(segment_values)]
        segments = ["General"] + segment_values
    else:
        segments = ["General"]
    
    tables: Dict[str, List[Dict[str, Any]]] = {}
    
    for segment in segments:
        # Filtrar DataFrame según el segmento
        if segment == "General":
            df_subset = df
        else:
            df_subset = df[df[segment_by].astype(str) == segment]
        
        segment_results: List[Dict[str, Any]] = []
        
        for var in variables:
            # No calcular frecuencia de la variable de segmentación sobre sí misma
            if var == segment_by and segment != "General":
                continue
                
            series = df_subset[var]
            freq_data = _calculate_frequency_for_series(series)
            
            segment_results.append({
                "variable": var,
                "rows": freq_data["rows"],
                "total": freq_data["total"]
            })
        
        tables[segment] = segment_results
    
    return {
        "segments": segments,
        "tables": tables
    }


def generate_summary_insights(rows: List[Dict[str, Any]], total_rows: int) -> List[Dict[str, Any]]:
    """
    Genera insights automáticos basados en los resultados de la tabla resumen.
    
    Returns:
        Lista de insights con tipo, título y descripción
    """
    insights: List[Dict[str, Any]] = []
    
    # 1. Insights de prevalencia para variables binarias
    binary_vars = [r for r in rows if r.get("is_binary") and r.get("media") is not None]
    for var in binary_vars:
        prevalence = var["media"] * 100
        if prevalence >= 30:
            insights.append({
                "type": "warning",
                "title": f"Alta prevalencia de {var['variable']}",
                "description": f"El {prevalence:.1f}% de la población presenta {var['variable']}."
            })
        elif prevalence >= 10:
            insights.append({
                "type": "info",
                "title": f"Prevalencia de {var['variable']}",
                "description": f"La prevalencia de {var['variable']} es del {prevalence:.1f}%."
            })
    
    # 2. Insights de calidad de datos (valores faltantes)
    for var in rows:
        if var.get("n") is not None and total_rows > 0:
            missing = total_rows - var["n"]
            missing_pct = (missing / total_rows) * 100
            if missing_pct > 10:
                insights.append({
                    "type": "error",
                    "title": f"Datos faltantes críticos en {var['variable']}",
                    "description": f"Atención: {var['variable']} tiene {missing} valores perdidos ({missing_pct:.1f}%)."
                })
            elif missing_pct > 5:
                insights.append({
                    "type": "warning",
                    "title": f"Datos faltantes en {var['variable']}",
                    "description": f"{var['variable']} tiene {missing} valores perdidos ({missing_pct:.1f}%)."
                })
    
    # 3. Insight de variable numérica principal (primera no binaria)
    numeric_vars = [r for r in rows if not r.get("is_binary") and r.get("media") is not None]
    if numeric_vars:
        main_var = numeric_vars[0]
        insights.insert(0, {
            "type": "info",
            "title": f"Promedio de {main_var['variable']}",
            "description": f"El promedio de {main_var['variable']} es {main_var['media']:.2f} (DE: {main_var.get('desvio_estandar', 0) or 0:.2f})."
        })
    
    # 4. Resumen general
    total_vars = len(rows)
    binary_count = len(binary_vars)
    numeric_count = len(numeric_vars)
    
    insights.insert(0, {
        "type": "success",
        "title": "Resumen del Dataset",
        "description": f"Se analizaron {total_vars} variables: {numeric_count} numéricas y {binary_count} binarias (Si/No)."
    })
    
    return insights


class DescriptiveService:
    """
    Service class for descriptive statistics calculations.
    
    Uses app.internal.stats.core.py as the mathematical engine.
    All methods are static as this service is stateless.
    """
    
    @staticmethod
    def calculate_descriptive_stats(
        df: pd.DataFrame,
        columns: Optional[List[str]] = None,
        group_by: Optional[str] = None,
        include_normality: bool = True,
        include_outliers: bool = True,
        include_ci: bool = True
    ) -> Tuple[Dict[str, ColumnStatistics], Optional[List[Table1Row]]]:
        """
        Calculate comprehensive descriptive statistics using core.py engine.
        """
        # 1. Determine which columns to analyze
        if columns is None:
            target_columns = DescriptiveService.get_numeric_columns(df)
        else:
            # Validate specified columns exist
            for col in columns:
                if col not in df.columns:
                    raise InvalidColumnError(col, df.columns.tolist())
            target_columns = columns
        
        # 2. Validate that target columns are numeric
        for col in target_columns:
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise NonNumericColumnError(col)
        
        # 3. Calculate univariate statistics for all columns
        stats_dict = DescriptiveService._calculate_univariate_stats(
            df, target_columns, include_normality, include_outliers, include_ci
        )
        
        # 4. If group_by is provided, generate Table 1
        table1_data = None
        if group_by and group_by in df.columns:
            table1_data = DescriptiveService._generate_table1(
                df, target_columns, group_by
            )
        
        return (stats_dict, table1_data)
    
    @staticmethod
    def _calculate_univariate_stats(
        df: pd.DataFrame,
        columns: List[str],
        include_normality: bool,
        include_outliers: bool,
        include_ci: bool
    ) -> Dict[str, ColumnStatistics]:
        """
        Calculate univariate statistics for each column using core.py.
        """
        results = {}
        
        for col in columns:
            series = df[col]
            clean_series = series.dropna()
            
            # If all values are missing, return minimal stats
            if len(clean_series) == 0:
                results[col] = ColumnStatistics(
                    count=0,
                    missing=int(series.isna().sum()),
                    mean=None, median=None, std=None, variance=None,
                    min=None, max=None, q1=None, q3=None, iqr=None,
                    skewness=None, kurtosis=None
                )
                continue
            
            # --- CORRECCIÓN 1: Llamada a core.py ---
            try:
                # core.py devuelve claves en Inglés (mean, std, skewness...)
                core_stats = core_calc_stats(clean_series)
            except Exception as e:
                print(f"Warning: core_calc_stats failed for {col}: {e}")
                core_stats = {}
            
            # --- CORRECCIÓN 2: Mapeo de Normalidad ---
            normality_data = None
            if include_normality and len(clean_series) >= 3:
                try:
                    norm_result = check_normality(clean_series)
                    normality_data = NormalityTest(
                        shapiro_statistic=norm_result.get('shapiro_stat'),
                        shapiro_p_value=norm_result.get('shapiro_p'), # Core usa 'shapiro_p'
                        kolmogorov_statistic=norm_result.get('ks_stat'),
                        kolmogorov_p_value=norm_result.get('ks_p'),   # Core usa 'ks_p'
                        anderson_statistic=norm_result.get('anderson_stat'),
                        anderson_critical_values=norm_result.get('anderson_critical'),
                        conclusion=norm_result.get('conclusion', 'Indeterminado'),
                        interpretation=f"Distribución {norm_result.get('conclusion', 'Indeterminado')}"
                    )
                except Exception as e:
                    print(f"Warning: check_normality failed for {col}: {e}")
            
            # --- CORRECCIÓN 3: Mapeo de Outliers ---
            outlier_data = None
            if include_outliers and len(clean_series) >= 3:
                try:
                    outlier_result = detect_outliers_advanced(clean_series)
                    # Core devuelve una tupla en 'bounds_iqr'
                    iqr_bounds = outlier_result.get('bounds_iqr', (None, None))
                    
                    outlier_data = OutlierAnalysis(
                        iqr_outliers_count=outlier_result.get('iqr_count', 0),
                        iqr_outliers_indices=outlier_result.get('iqr_outliers', []), # Core usa 'iqr_outliers'
                        zscore_outliers_count=outlier_result.get('zscore_count', 0),
                        zscore_outliers_indices=outlier_result.get('zscore_outliers', []), # Core usa 'zscore_outliers'
                        mad_outliers_count=outlier_result.get('mad_count', 0),
                        mad_outliers_indices=outlier_result.get('mad_outliers', []), # Core usa 'mad_outliers'
                        iqr_lower_bound=float(iqr_bounds[0]) if iqr_bounds[0] is not None else None,
                        iqr_upper_bound=float(iqr_bounds[1]) if iqr_bounds[1] is not None else None
                    )
                except Exception as e:
                    print(f"Warning: detect_outliers_advanced failed for {col}: {e}")
            
            # --- CORRECCIÓN 4: Intervalos de Confianza ---
            ci_data = None
            # Core usa 'ci95_lower' / 'ci95_upper'
            if include_ci and core_stats.get('ci95_lower') is not None:
                ci_data = ConfidenceInterval(
                    lower=float(core_stats.get('ci95_lower', 0)),
                    upper=float(core_stats.get('ci95_upper', 0)),
                    confidence_level=0.95
                )
            
            # --- Cálculo manual de Varianza (Core no la devuelve) ---
            std_val = core_stats.get('std')
            variance_val = std_val**2 if std_val is not None else None

            # --- NUEVOS CÁLCULOS: sum, geometric_mean, mode ---
            # Suma total
            sum_val = _safe_float(clean_series.sum())
            
            # Media Geométrica (requiere valores > 0)
            geometric_mean_val = _calculate_geometric_mean(clean_series)
            
            # Moda
            mode_val = _calculate_mode(clean_series)

            # --- CORRECCIÓN FINAL: Mapeo del Diccionario Principal ---
            # Aquí conectamos las claves en Inglés de core.py con tu Schema
            results[col] = ColumnStatistics(
                # Conteos
                count=int(core_stats.get('n', len(clean_series))),
                missing=int(core_stats.get('n_faltantes', series.isna().sum())),
                
                # Tendencia Central y Dispersión
                mean=core_stats.get('mean'),       # Antes: 'media' (Error)
                median=core_stats.get('median'),   # Antes: 'mediana' (Error)
                std=std_val,                       # Antes: 'desv_std' (Error)
                variance=variance_val,             # Calculado arriba
                
                # Rangos
                min=core_stats.get('min'),         # Antes: 'minimo' (Error)
                max=core_stats.get('max'),         # Antes: 'maximo' (Error)
                
                # Cuartiles (Core usa minúsculas)
                q1=core_stats.get('p25'),          # Antes: 'P25' (Error)
                q3=core_stats.get('p75'),          # Antes: 'P75' (Error)
                iqr=core_stats.get('iqr'),         # Antes: 'IQR' (Error)
                
                # Forma
                skewness=core_stats.get('skewness'), # Antes: 'asimetria' (Error)
                kurtosis=core_stats.get('kurtosis'), # Antes: 'curtosis' (Error)
                
                # Métricas Avanzadas
                sem=core_stats.get('sem'),         # Antes: 'SEM' (Error)
                cv=core_stats.get('cv'),           # Antes: 'CV' (Error)
                range=core_stats.get('range'),     # Antes: 'rango' (Error)
                ci_95=ci_data,
                
                # NUEVAS métricas requeridas
                sum=sum_val,
                geometric_mean=geometric_mean_val,
                mode=mode_val,
                
                # Percentiles Extra
                p5=core_stats.get('p5'),
                p10=core_stats.get('p10'),
                p90=core_stats.get('p90'),
                p95=core_stats.get('p95'),
                
                # Objetos Anidados
                normality=normality_data,
                outliers=outlier_data
            )
        
        return results
    
    @staticmethod
    def _generate_table1(
        df: pd.DataFrame,
        variables: List[str],
        group_col: str
    ) -> List[Table1Row]:
        """
        Generate Table 1 comparative statistics using core.py.
        """
        try:
            # Call core.py to generate Table 1 structure
            df_table1 = generate_table_one_structure(df, variables, group_col)
            
            if df_table1 is None or df_table1.empty:
                return []
            
            # Convert DataFrame to List[Table1Row]
            rows = []
            
            for _, row_data in df_table1.iterrows():
                var_name = row_data.get('Variable/Característica', '')
                p_val_str = row_data.get('P-Value', '-')
                test_name = row_data.get('Test Usado', '')
                
                # Extract group values (all columns except metadata)
                groups_dict = {}
                for col in df_table1.columns:
                    if col not in ['Variable/Característica', 'P-Value', 'Test Usado']:
                        groups_dict[col] = str(row_data.get(col, '-'))
                
                # Determine if result is statistically significant
                is_sig = False
                if p_val_str and p_val_str != '-':
                    try:
                        if '<' in p_val_str:
                            is_sig = True
                        else:
                            p_float = float(p_val_str)
                            is_sig = p_float < 0.05
                    except (ValueError, TypeError):
                        pass
                
                rows.append(Table1Row(
                    variable=var_name,
                    total=None,
                    groups=groups_dict,
                    p_value=p_val_str,
                    test_used=test_name,
                    is_significant=is_sig
                ))
            
            return rows
            
        except Exception as e:
            print(f"Error generating Table 1: {e}")
            return []
    
    @staticmethod
    def get_numeric_columns(df: pd.DataFrame) -> List[str]:
        """
        Get list of all numeric columns in the DataFrame.
        """
        return df.select_dtypes(include=[np.number]).columns.tolist()
