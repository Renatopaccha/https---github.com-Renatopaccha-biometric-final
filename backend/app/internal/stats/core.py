"""
Módulo Core de Estadísticas (BioStat Easy)
------------------------------------------
Este módulo es el núcleo de las operaciones estadísticas básicas y validación de datos.
Proporciona funciones fundamentales que son utilizadas por otros módulos más avanzados.

Responsabilidades:
- Cálculos descriptivos básicos (Media, Mediana, Desviación Estándar, etc.)
- Análisis de datos faltantes (Missing Values)
- Detección de valores atípicos (Outliers)
- Validaciones de integridad de datos para análisis
- Manejo e imputación de valores faltantes

Autor: BioStat Easy Team
Versión: 2.5
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import chi2_contingency, fisher_exact
from typing import Dict, Union, Optional, List, Tuple, Any

def calculate_descriptive_stats(data: Union[pd.Series, np.ndarray, List], 
                               percentiles: Optional[List[float]] = None) -> Dict[str, float]:
    """
    Calcula estadísticas descriptivas completas (Estándar + Epidemiología) para un conjunto de datos.
    
    Args:
        data: Serie de pandas, array de numpy o lista con datos numéricos.
        percentiles: Argumento mantenido por compatibilidad, pero la función calcula 
                     una batería fija de percentiles epidemiológicos importanets.
    
    Returns:
        Diccionario con métricas: N, Media, Mediana, DE, Min, Max, Skew, Kurt,
        SEM, CV, Rango, IC95, Percentiles (5, 10, 25, 50, 75, 90, 95) e IQR.
    """
    # 1. Validación y Limpieza de Datos
    if isinstance(data, list):
        data = pd.Series(data)
    elif isinstance(data, np.ndarray):
        data = pd.Series(data)
    
    if not isinstance(data, pd.Series):
        try:
            data = pd.Series(data)
        except Exception:
            # Retorno seguro de NaN si falla conversión inicial
            return {k: np.nan for k in ["N", "Mean", "Median", "Std", "Min", "Max", "Skew", "Kurt", "SEM", "CV", "Range", "IQR"]}

    # Convertir a numérico y limpiar
    data = pd.to_numeric(data, errors='coerce')
    data_clean = data.dropna()
    
    # Manejo de dataset vacío o insuficiente
    if len(data_clean) == 0:
        base_nan = {
            "n": 0, "mean": np.nan, "median": np.nan, "std": np.nan,
            "min": np.nan, "max": np.nan, "range": np.nan,
            "skewness": np.nan, "kurtosis": np.nan,
            "sem": np.nan, "cv": np.nan,
            "ci95_lower": np.nan, "ci95_upper": np.nan,
            "iqr": np.nan
        }
        # Agregar percentiles NaN
        for p in [5, 10, 25, 50, 75, 90, 95]:
            base_nan[f"p{p}"] = np.nan
        return base_nan

    # 2. Cálculos Principales
    try:
        # Básicos
        n_obs = len(data_clean)
        mean_val = data_clean.mean()
        std_val = data_clean.std()
        min_val = data_clean.min()
        max_val = data_clean.max()
        median_val = data_clean.median()
        
        # Avanzados (Shape)
        skew_val = data_clean.skew()
        kurt_val = data_clean.kurt() # Exceso curtosis (pandas default)
        
        # Epidemiológicos / Variabilidad
        sem_val = stats.sem(data_clean, nan_policy='omit')
        range_val = max_val - min_val
        
        # Coeficiente de Variación (%)
        cv_val = (std_val / mean_val * 100) if mean_val != 0 else np.nan
        
        # Intervalo de Confianza 95% (T-Student)
        if n_obs > 1:
            ci = stats.t.interval(0.95, df=n_obs-1, loc=mean_val, scale=sem_val)
            ci_lower, ci_upper = ci[0], ci[1]
        else:
            ci_lower, ci_upper = np.nan, np.nan

        # Batería de Percentiles (Numpy es más eficiente para múltiples cortes)
        # [5, 10, 25, 50, 75, 90, 95]
        perc_values = np.percentile(data_clean, [5, 10, 25, 50, 75, 90, 95])
        
        p5, p10, p25, p50, p75, p90, p95 = perc_values
        
        iqr_val = p75 - p25

        # 3. Construcción del Diccionario de Retorno
        results = {
            # Básicos
            "n": int(n_obs),
            "mean": mean_val,
            "median": median_val,
            "std": std_val,
            "min": min_val,
            "max": max_val,
            "skewness": skew_val,
            "kurtosis": kurt_val,
            
            # Avanzados
            "sem": sem_val,
            "cv": cv_val,
            "range": range_val,
            
            # Intervalos
            "ci95_lower": ci_lower,
            "ci95_upper": ci_upper,
            
            # Percentiles
            "p5": p5,
            "p10": p10,
            "p25": p25, # Q1
            "p50": p50, # Mediana check
            "p75": p75, # Q3
            "p90": p90,
            "p95": p95,
            
            # Dispersión
            "iqr": iqr_val,
            
            # Alias comúnes para compatibilidad UI previa
            "N": int(n_obs),
            "Media": mean_val,
            "Mediana": median_val,
            "SD": std_val,
            "Min": min_val,
            "Max": max_val,
            "Rango": range_val,
            "IQR": iqr_val,
            "Q1": p25,
            "Q3": p75
        }
        
        return results

    except Exception:
        # Fallback de seguridad extrema
        return {
            "n": 0, "mean": np.nan, "median": np.nan, "std": np.nan,
            "min": np.nan, "max": np.nan, "skewness": np.nan, "kurtosis": np.nan
        }


def analyze_missing_values(df: pd.DataFrame, 
                         columns: Optional[List[str]] = None, 
                         verbose: bool = True) -> Dict[str, Any]:
    """
    Analiza la presencia de datos faltantes en un DataFrame.
    
    Args:
        df: DataFrame de pandas a analizar.
        columns: Lista opcional de columnas específicas a revisar. 
                 Si es None, revisa todas.
        verbose: Si es True (deprecated en esta versión core, mantenido por firma), 
                 podría imprimir logs, pero aquí solo afecta el retorno de detalles.

    Returns:
        Diccionario con:
        - total_cells: Total de celdas consideradas.
        - total_missing_count: Número total de valores NaN.
        - total_missing_pct: Porcentaje total de datos faltantes.
        - cols_with_missing: Lista de columnas con al menos un NaN.
        - missing_by_col: Diccionario tallado por columna {col: {'count': N, 'pct': %}}.
    """
    if df is None:
        return {"error": "DataFrame es None"}
        
    if columns:
        try:
            df_target = df[columns]
        except KeyError as e:
            return {"error": f"Columnas no encontradas: {e}"}
    else:
        df_target = df

    total_cells = np.product(df_target.shape)
    missing_count = df_target.isna().sum().sum()
    missing_pct = (missing_count / total_cells * 100) if total_cells > 0 else 0
    
    # Análisis por columna
    missing_series = df_target.isna().sum()
    missing_cols = missing_series[missing_series > 0]
    
    missing_details = {}
    for col, count in missing_cols.items():
        total_col = len(df_target)
        pct_col = (count / total_col * 100) if total_col > 0 else 0
        missing_details[col] = {
            "count": int(count),
            "pct": float(pct_col)
        }
        
    return {
        "total_cells": int(total_cells),
        "total_rows_dataframe": len(df),
        "total_missing_count": int(missing_count),
        "total_missing_pct": float(missing_pct),
        "cols_with_missing": list(missing_details.keys()),
        "missing_by_col": missing_details,
        "is_clean": missing_count == 0
    }


def detect_outliers(data: Union[pd.Series, np.ndarray], 
                   method: str = 'iqr', 
                   multiplier: float = 1.5) -> pd.Series:
    """
    Detecta valores atípicos (outliers) en una serie de datos.
    
    Args:
        data: Serie de datos numéricos.
        method: Método de detección:
                - 'iqr': Rango Intercuartílico (Tukey's fences).
                - 'zscore': Puntaje Z (Desviación estándar).
                - 'mad': Desviación Absoluta de la Mediana (Modified Z-score).
        multiplier: Factor de sensibilidad. 
                    - Para IQR: usualmente 1.5 (leve) o 3.0 (extremo).
                    - Para Z-score: usualmente 3.0.
                    - Para MAD: usualmente 3.5.

    Returns:
        pd.Series booleana con el mismo índice que 'data', 
        donde True indica que el valor es un outlier.
    """
    # Conversión a Series y limpieza de NaNs para cálculo (pero mantener índice original)
    if not isinstance(data, pd.Series):
        data = pd.Series(data)
    
    # Coerción numérica
    data_num = pd.to_numeric(data, errors='coerce')
    
    # Máscara inicial False
    outliers_mask = pd.Series(False, index=data.index)
    
    # Si hay NaNs, no son outliers, se ignoran en el cálculo
    valid_data = data_num.dropna()
    
    if len(valid_data) == 0:
        return outliers_mask

    if method == 'iqr':
        Q1 = valid_data.quantile(0.25)
        Q3 = valid_data.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - (multiplier * IQR)
        upper_bound = Q3 + (multiplier * IQR)
        
        # Detectar en data original (usando índices de valid_data para la lógica)
        outliers_indices = valid_data[(valid_data < lower_bound) | (valid_data > upper_bound)].index
        outliers_mask.loc[outliers_indices] = True

    elif method == 'zscore':
        # Z = (X - Mean) / SD
        z_scores = np.abs(stats.zscore(valid_data))
        outliers_indices = valid_data[z_scores > multiplier].index
        outliers_mask.loc[outliers_indices] = True
        
    elif method == 'mad':
        # Modified Z-score = 0.6745 * (X - Median) / MAD
        median = valid_data.median()
        mad = stats.median_abs_deviation(valid_data, scale='normal') # scale='normal' hace consistency adjustment
        
        # Si MAD es 0 (ej. muchos valores repetidos), puede dar infinito.
        if mad == 0:
            # Fallback a distancia simple de la mediana
            mad = 1.0 # Evitar división por cero, aunque esto invalida el test estricto
            
        modified_z = 0.6745 * (valid_data - median) / mad
        outliers_indices = valid_data[np.abs(modified_z) > multiplier].index
        outliers_mask.loc[outliers_indices] = True
        
    else:
        raise ValueError(f"Método desconocido: {method}. Use 'iqr', 'zscore' o 'mad'.")
        
    return outliers_mask


def detect_outliers_advanced(series: Union[pd.Series, np.ndarray, List]) -> Dict[str, Any]:
    """
    Analiza una serie de datos numérica y aplica 3 métodos simultáneos de detección de outliers.
    
    Args:
        series: Serie de pandas, array (numpy) o lista de datos numéricos.
        
    Returns:
        Diccionario con listas de índices de outliers para IQR, Z-Score y MAD,
        además de conteos y los límites del método IQR.
    """
    # 1. Validación y Conversión
    if not isinstance(series, pd.Series):
        series = pd.Series(series)
        
    # Importante: Mantener índices originales
    # Convertir a numérico, coercendo errores a NaN
    data = pd.to_numeric(series, errors='coerce')
    
    # Ignoramos NaNs para el cálculo estadístico pero mantenemos índices en valid_data
    valid_data = data.dropna()
    
    if len(valid_data) == 0:
        return {
            "iqr_outliers": [], "zscore_outliers": [], "mad_outliers": [],
            "iqr_count": 0, "zscore_count": 0, "mad_count": 0,
            "bounds_iqr": (np.nan, np.nan)
        }

    # --- A) Método IQR ---
    Q1 = valid_data.quantile(0.25)
    Q3 = valid_data.quantile(0.75)
    IQR = Q3 - Q1
    lower_limit = Q1 - 1.5 * IQR
    upper_limit = Q3 + 1.5 * IQR
    
    iqr_outliers = valid_data[(valid_data < lower_limit) | (valid_data > upper_limit)].index.tolist()
    
    # --- B) Método Z-Score ---
    # Z = (x - mean) / std. Criterio |Z| > 3
    mean_val = valid_data.mean()
    std_val = valid_data.std()
    
    zscore_outliers = []
    if std_val > 0:
        z_scores = (valid_data - mean_val) / std_val
        zscore_outliers = valid_data[np.abs(z_scores) > 3].index.tolist()
    
    # --- C) Método MAD (Robust Z-Score) ---
    # Mediana
    median_val = valid_data.median()
    # MAD = mediana(|x - mediana|)
    # Usamos np.median sobre los valores absolutos de las desviaciones para asegurar consistencia
    mad_val = np.median(np.abs(valid_data - median_val))
    
    mad_outliers = []
    if mad_val == 0:
        # Si MAD es 0, cualquier valor diferente de la mediana es un outlier extremo
        mad_outliers = valid_data[valid_data != median_val].index.tolist()
    else:
        # Modified Z = 0.6745 * (x - mediana) / MAD
        mod_z_scores = 0.6745 * (valid_data - median_val) / mad_val
        # Criterio: |Modified Z| > 3.5
        mad_outliers = valid_data[np.abs(mod_z_scores) > 3.5].index.tolist()
        
    return {
        "iqr_outliers": iqr_outliers,
        "zscore_outliers": zscore_outliers,
        "mad_outliers": mad_outliers,
        "iqr_count": len(iqr_outliers),
        "zscore_count": len(zscore_outliers),
        "mad_count": len(mad_outliers),
        "bounds_iqr": (lower_limit, upper_limit)
    }


def validate_data_for_analysis(df: pd.DataFrame, 
                             required_cols: Optional[List[str]] = None, 
                             minrows: int = 2) -> Tuple[bool, str]:
    """
    Valida la integridad básica de un DataFrame para análisis estadístico.
    
    Args:
        df: DataFrame a validar.
        required_cols: Lista de columnas que DEBEN estar presentes.
        minrows: Número mínimo de filas requeridas.

    Returns:
        Tupla (is_valid, error_message).
        - is_valid: True si pasa todas las comprobaciones.
        - error_message: String descriptivo del error o "OK".
    """
    # 1. Existencia
    if df is None:
        return False, "El dataset no está inicializado (es None)."
    
    if not isinstance(df, pd.DataFrame):
        return False, f"El objeto de datos no es un DataFrame válido ({type(df)})."
        
    # 2. Vacío
    if df.empty:
        return False, "El dataset está completamente vacío."
        
    # 3. Filas mínimas
    if len(df) < minrows:
        return False, f"Datos insuficientes. Se requieren al menos {minrows} filas, hay {len(df)}."
        
    # 4. Columnas requeridas
    if required_cols:
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            return False, f"Faltan columnas requeridas: {', '.join(missing_cols)}"
            
    # 5. Filas con datos completos (Opcional, pero advertencia)
    # No fallamos aquí, pero analizamos si hay al menos una columna con datos
    valid_counts = df.count()
    if valid_counts.max() == 0:
        return False, "Todas las columnas contienen valores nulos (NaN)."

    return True, "OK"


def validate_column_for_analysis(df: pd.DataFrame, 
                               col: str) -> Tuple[bool, str]:
    """
    Valida una columna específica dentro de un DataFrame.
    
    Args:
        df: DataFrame contenedor.
        col: Nombre de la columna.

    Returns:
        Tupla (is_valid, error_message).
    """
    # 1. Existencia en DataFrame
    if col not in df.columns:
        return False, f"La columna '{col}' no existe en el dataset."
        
    series = df[col]
    
    # 2. Datos nulos totales
    if series.isna().all():
        return False, f"La columna '{col}' está completamente vacía (todos son NaN)."
        
    # 3. Constantes (Varianza 0) - A veces útil saberlo, a veces bloqueante
    # Para análisis estadístico general, una constante no suele ser útil.
    if series.nunique(dropna=True) <= 1 and len(series.dropna()) > 1:
        # Advertencia, aunque a veces técnicamente válido
        # Se permite pasar, pero con observación. Dependiendo del rigor estricto, podría ser False.
        # Aquí retornamos True pero con un mensaje que podría ser usado como Warning fuera.
        # Vamos a ser permisivos para validación estructural.
        pass # return True, "Variable constante (varianza 0)."
        
    return True, "OK"


def handle_missing_values(data_series: pd.Series, 
                        method: str = 'drop') -> pd.Series:
    """
    Maneja valores faltantes en una serie según el método especificado.
    
    Args:
        data_series: Serie de datos con potenciales NaNs.
        method: Estrategia de imputación:
                - 'drop': Elimina los NaNs.
                - 'mean': Imputa con la media (solo numéricos).
                - 'median': Imputa con la mediana (solo numéricos).
                - 'mode': Imputa con la moda.
                - 'zero': Rellena con 0.
                - 'ffill': Forward fill.
                - 'bfill': Backward fill.

    Returns:
        Nueva pd.Series con los datos tratados.
    """
    s = data_series.copy()
    
    if method == 'drop':
        return s.dropna()
    
    elif method == 'zero':
        return s.fillna(0)
        
    elif method == 'ffill':
        return s.fillna(method='ffill')
        
    elif method == 'bfill':
        return s.fillna(method='bfill')
        
    elif method == 'mode':
        modas = s.mode()
        if not modas.empty:
            return s.fillna(modas[0])
        return s # Si no hay moda (todos NaN), devuelve igual
        
    # Métodos numéricos
    elif method in ['mean', 'median']:
        # Verificar tipo numérico
        if not pd.api.types.is_numeric_dtype(s):
            # Intentar convertir
            s_num = pd.to_numeric(s, errors='coerce')
            if s_num.isna().all():
                raise ValueError(f"No se puede aplicar método '{method}' a datos no numéricos.")
            
            # Usar la versión numérica para calcular, pero rellenar en la original
            # Esto asume que queremos imputar numéricamente.
            if method == 'mean':
                val = s_num.mean()
            else:
                val = s_num.median()
                
            return s_num.fillna(val)
        else:
            if method == 'mean':
                val = s.mean()
            else:
                val = s.median()
            return s.fillna(val)
            
    else:
        raise ValueError(f"Método de imputación desconocido: {method}")


def calculate_advanced_descriptive_stats(data: Union[pd.Series, np.ndarray]) -> Dict[str, float]:
    """
    Calcula estadísticas descriptivas avanzadas (forma de distribución e incerteza).
    
    Args:
        data: Datos numéricos.

    Returns:
        Diccionario con:
        - Asimetría (Skewness)
        - Curtosis (Kurtosis)
        - CV: Coeficiente de Variación (SD/Media)
        - SEM: Error Estándar de la Media
        - IC95_inf: Límite inferior Intervalo de Confianza 95%
        - IC95_sup: Límite superior Intervalo de Confianza 95%
    """
    if isinstance(data, list) or isinstance(data, np.ndarray):
        data = pd.Series(data)
        
    data = pd.to_numeric(data, errors='coerce').dropna()
    
    if len(data) < 2:
         return {
            "Asimetría": np.nan, "Curtosis": np.nan, 
            "CV": np.nan, "SEM": np.nan, 
            "IC95_inf": np.nan, "IC95_sup": np.nan
        }
        
    mean_val = data.mean()
    sd_val = data.std()
    n = len(data)
    
    # Error Estándar de la Media
    sem = stats.sem(data)
    
    # Intervalo de Confianza 95% (asumiendo distribución t-student por ser muestra)
    # grados de libertad = n - 1
    ci = stats.t.interval(0.95, df=n-1, loc=mean_val, scale=sem)
    
    # Coeficiente de Variación
    cv = (sd_val / mean_val) if mean_val != 0 else np.inf
    
    return {
        "Asimetría": data.skew(),
        "Curtosis": data.kurt(), # Exceso de curtosis (Pandas usa Fisher por defecto -> Normal=0)
        "CV": cv,
        "SEM": sem,
        "IC95_inf": ci[0],
        "IC95_sup": ci[1]
    }


def check_normality(series: Union[pd.Series, np.ndarray, List]) -> Dict[str, Any]:
    """
    Evalúa la normalidad de una distribución mediante 3 tests estadísticos.
    
    Args:
        series: Datos numéricos.
        
    Returns:
        Diccionario con estadísticos, p-valores y conclusión.
    """
    if not isinstance(series, pd.Series):
        series = pd.Series(series)
        
    clean_series = pd.to_numeric(series, errors='coerce').dropna()
    n = len(clean_series)
    
    if n < 3:
        return {"conclusion": "Datos insuficientes (N<3)", "shapiro_p": np.nan, "ks_p": np.nan, "jb_p": np.nan}
        
    # Resultados
    res = {}
    
    # 1. Shapiro-Wilk
    try:
        # Nota: Scipy warnings si N > 5000, pero calcula.
        stat_sw, p_sw = stats.shapiro(clean_series)
        res['shapiro_stat'] = stat_sw
        res['shapiro_p'] = p_sw
    except Exception:
        res['shapiro_stat'] = np.nan
        res['shapiro_p'] = np.nan

    # 2. Kolmogorov-Smirnov (Lilliefors aprox. usando media/std muestral)
    try:
        mean_val = clean_series.mean()
        std_val = clean_series.std()
        # stats.kstest compara contra cdf teórica. Pasamos args para norm.
        stat_ks, p_ks = stats.kstest(clean_series, 'norm', args=(mean_val, std_val))
        res['ks_stat'] = stat_ks
        res['ks_p'] = p_ks
    except Exception:
        res['ks_stat'] = np.nan
        res['ks_p'] = np.nan

    # 3. Jarque-Bera
    try:
        stat_jb, p_jb = stats.jarque_bera(clean_series)
        res['jb_stat'] = stat_jb
        res['jb_p'] = p_jb
    except Exception:
        res['jb_stat'] = np.nan
        res['jb_p'] = np.nan
        
    # Conclusión
    # Criterio: Normal si p > 0.05 en al menos 2 tests O Shapiro (estándar oro en medicina pequeña muestra)
    p_values = [res.get('shapiro_p', 0), res.get('ks_p', 0), res.get('jb_p', 0)]
    valid_p = [p for p in p_values if pd.notna(p)]
    
    count_normal = sum(1 for p in valid_p if p > 0.05)
    
    if count_normal >= 2:
        res['conclusion'] = "Normal"
    elif n < 50 and res.get('shapiro_p', 0) > 0.05:
        res['conclusion'] = "Normal" # Shapiro manda en muestras pequeñas
    else:
        res['conclusion'] = "No Normal"
        
    return res


def check_homoscedasticity(df: pd.DataFrame, 
                         num_var: str, 
                         group_var: str) -> Dict[str, Any]:
    """
    Evalúa la homocedasticidad (igualdad de varianzas) entre grupos.
    """
    if df is None or num_var not in df.columns or group_var not in df.columns:
        return {"conclusion": "Error: Variables no encontradas"}
        
    # Preparar grupos
    groups = []
    try:
        # Eliminar NaNs en cualquiera de las 2 variables
        data = df[[num_var, group_var]].dropna()
        
        for g, subset in data.groupby(group_var):
            if len(subset) > 1: # Necesitamos varianza
                groups.append(subset[num_var].values)
                
        if len(groups) < 2:
            return {"conclusion": "Error: Menos de 2 grupos válidos"}
            
        res = {}
        
        # 1. Levene (Más robusto a no normalidad)
        stat_lev, p_lev = stats.levene(*groups)
        res['levene_stat'] = stat_lev
        res['levene_p'] = p_lev
        
        # 2. Fligner-Killeen (Non-parametric)
        stat_flig, p_flig = stats.fligner(*groups)
        res['fligner_stat'] = stat_flig
        res['fligner_p'] = p_flig
        
        # Conclusión
        # Si p > 0.05 en Levene -> Homocedástico (estándar práctico)
        if p_lev > 0.05:
            res['conclusion'] = "Homocedástico"
        else:
            res['conclusion'] = "Heterocedástico"
            
        return res
        
    except Exception as e:
        return {"conclusion": f"Error cálculo: {str(e)}", "levene_p": np.nan}


def check_symmetry_kurtosis(skew_val: float, kurt_val: float) -> Dict[str, str]:
    """
    Interpreta coeficientes de asimetría y curtosis.
    
    Args:
        skew_val: Coeficiente de asimetría (Fisher-Pearson).
        kurt_val: Exceso de curtosis (Fisher, Normal=0).
    """
    res = {}
    
    # Simetría: [-0.5, 0.5]
    if pd.isna(skew_val):
        res['symmetry_eval'] = "Indeterminado"
    elif -0.5 <= skew_val <= 0.5:
        res['symmetry_eval'] = "Simétrica"
    else:
        res['symmetry_eval'] = "Asimétrica"
        
    # Curtosis (Exceso):
    # Rango [-1, 1] para Mesocúrtica (Normal=0)
    if pd.isna(kurt_val):
        res['kurtosis_eval'] = "Indeterminado"
    elif -1 <= kurt_val <= 1:
        res['kurtosis_eval'] = "Mesocúrtica"
    elif kurt_val > 1:
        res['kurtosis_eval'] = "Leptocúrtica"
    else:
        res['kurtosis_eval'] = "Platicúrtica"
        
    return res


def get_normal_curve_data(series: Union[pd.Series, np.ndarray, List]) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    """
    Genera coordenadas (x, y) de la curva normal ideal ajustada a los datos.
    
    Args:
        series: Datos numéricos.
        
    Returns:
        Tuple(x_axis, pdf_values). Retorna (None, None) si falla.
    """
    try:
        data = pd.to_numeric(series, errors='coerce').dropna()
        if len(data) < 2 or data.std() == 0:
            return None, None
            
        mu = data.mean()
        sigma = data.std()
        
        # Rango para dibujar: min/max extendido un poco para estética
        x_min, x_max = data.min(), data.max()
        margin = (x_max - x_min) * 0.1 if x_max != x_min else 1.0
        
        x_axis = np.linspace(x_min - margin, x_max + margin, 200)
        y_axis = stats.norm.pdf(x_axis, mu, sigma)
        
        return x_axis, y_axis
    except Exception:
        return None, None


def get_qq_coordinates(series: Union[pd.Series, np.ndarray, List]) -> Dict[str, Any]:
    """
    Calcula las coordenadas para un Q-Q Plot (Normalidad).
    
    Returns:
        Diccionario con:
        - 'theoretical': Cuantiles teóricos (Eje X)
        - 'sample': Cuantiles muestrales ordenados (Eje Y)
        - 'slope': Pendiente línea regresión
        - 'intercept': Intercepto línea
        - 'r_value': Coeficiente R
    """
    try:
        data = pd.to_numeric(series, errors='coerce').dropna()
        if len(data) < 2:
            return {}
            
        # stats.probplot retorna ((osm, osr), (slope, intercept, r))
        # osm = theoretical quantiles, osr = ordered responses
        (osm, osr), (slope, intercept, r) = stats.probplot(data, dist="norm", fit=True)
        
        return {
            "theoretical": osm,
            "sample": osr,
            "slope": slope,
            "intercept": intercept,
            "r_value": r
        }
    except Exception:
        return {}


def analyze_outlier_details(series: pd.Series, 
                          outliers_indices: List[Any], 
                          method_name: str) -> Dict[str, Any]:
    """
    Analiza un conjunto de outliers detectados para generar un reporte detallado y sugerencias de acción.
    
    Args:
        series: La serie de datos original (con índice compatible con outliers_indices).
        outliers_indices: Lista de índices identificados como outliers.
        method_name: Nombre del método usado (solo para referencia interna/logs si se requiere).
        
    Returns:
        Diccionario con:
        - 'values_str': String formateado con los valores (ej: "150.2, 148.5...").
        - 'action': Acción sugerida basada en heurística ("Revisar", "Error probable", etc.).
        - 'count': Cantidad de outliers.
    """
    if not outliers_indices:
        return {'values_str': "-", 'action': "-", 'count': 0}

    try:
        # 1. Extraer valores reales
        vals = series.loc[outliers_indices].values
        # Ordenar descendente (los más grandes suelen ser más interesantes/peligrosos)
        vals_sorted = np.sort(vals)[::-1]
        
        # 2. Generar String de Valores (Limitado a 5)
        count = len(vals_sorted)
        if count > 5:
            display_vals = vals_sorted[:4]
            vals_str = ", ".join([f"{v:.2f}" for v in display_vals]) + ", ..."
        else:
            vals_str = ", ".join([f"{v:.2f}" for v in vals_sorted])
            
        # 3. Generar Acción Sugerida (Heurística Z-Score local)
        # Calculamos Z-score de estos valores respecto a la serie COMPLETA (sin dropna si es posible, o con)
        # Asumimos que la serie original tiene suficientes datos para media/std estables.
        mean_series = series.mean()
        std_series = series.std()
        
        action = "⚠️ Revisar manual" # Default
        
        if std_series > 0:
            # Calcular Z para el valor más extremo (el primero de sorted)
            max_abs_z = abs((vals_sorted[0] - mean_series) / std_series)
            
            if max_abs_z > 5:
                action = "🔴 Error probable (Extremo)"
            elif max_abs_z > 3:
                action = "⚠️ Revisar (Moderado)"
            else:
                action = "ℹ️ Atípico leve" # Caso raro si fue detectado como outlier pero Z es bajo (ej: MAD vs Z discrepancia)
        
        return {
            'values_str': vals_str,
            'action': action,
            'count': count
        }
        
    except Exception as e:
        return {'values_str': "Error al procesar", 'action': "Error", 'count': len(outliers_indices)}


def calculate_group_comparison(df: pd.DataFrame, 
                             num_var: str, 
                             group_var: str) -> Dict[str, Any]:
    """
    Calcula comparaciones estadísticas entre grupos para una variable numérica (Tabla 1).
    Decide automáticamente el test estadístico (T-Test/ANOVA vs Mann-Whitney/Kruskal).
    
    Args:
        df: DataFrame con los datos.
        num_var: Variable numérica dependiente.
        group_var: Variable categórica de agrupación.
        
    Returns:
        Diccionario con resultados del test y estadísticas descriptivas por grupo.
    """
    if df is None or num_var not in df.columns or group_var not in df.columns:
        return {'test_used': 'Error (Vars)', 'p_value_str': '-', 'groups_data': {}}

    try:
        data = df[[num_var, group_var]].dropna()
        groups = data.groupby(group_var)
        
        if len(groups) < 2:
             return {'test_used': 'N/A (1 Grupo)', 'p_value_str': '-', 'groups_data': {}}

        # 1. Análisis por subgrupo (Descriptiva + Normalidad)
        groups_data = {}
        all_normal = True
        group_values_list = []
        
        for name, group in groups:
            vals = group[num_var].values
            n = len(vals)
            if n < 2: all_normal = False # No se puede asumir normalidad con N<2
            
            # Descriptivos
            mean_val, std_val = np.mean(vals), np.std(vals, ddof=1) if n > 1 else 0
            median_val = np.median(vals)
            q1, q3 = np.percentile(vals, [25, 75])
            min_v, max_v = np.min(vals), np.max(vals)
            
            # Chequeo Normalidad Local
            # Criterio: Shapiro si n < 50, KS si n >= 50
            is_normal_group = False
            if n >= 3:
                try:
                    if n < 50:
                        _, p_norm = stats.shapiro(vals)
                    else:
                        # KS contra normal teórica estimada
                        _, p_norm = stats.kstest(vals, 'norm', args=(mean_val, std_val))
                    
                    if p_norm > 0.05:
                        is_normal_group = True
                except:
                    pass # Asumimos no normal si falla test
            
            if not is_normal_group:
                all_normal = False
                
            groups_data[str(name)] = {
                'n': n,
                'mean_sd': f"{mean_val:.2f} ± {std_val:.2f}",
                'median_iqr': f"{median_val:.2f} ({q1:.2f}-{q3:.2f})",
                'min_max': f"{min_v:.2f} - {max_v:.2f}"
            }
            group_values_list.append(vals)

        # 2. Homocedasticidad (Levene)
        # Si p > 0.05 -> Varianzas iguales
        is_homoscedastic = False
        try:
            _, p_levene = stats.levene(*group_values_list)
            if p_levene > 0.05:
                is_homoscedastic = True
        except:
            pass # Asumimos heterocedasticidad

        # 3. Selección y Ejecución del Test
        p_val = np.nan
        test_name = "N/A"
        
        n_groups = len(group_values_list)
        
        if n_groups == 2:
            # Caso 2 Grupos
            if all_normal and is_homoscedastic:
                test_name = "T-Student"
                _, p_val = stats.ttest_ind(group_values_list[0], group_values_list[1], equal_var=True)
            elif all_normal and not is_homoscedastic:
                test_name = "T-Welch"
                _, p_val = stats.ttest_ind(group_values_list[0], group_values_list[1], equal_var=False)
            else:
                test_name = "U Mann-Whitney"
                _, p_val = stats.mannwhitneyu(group_values_list[0], group_values_list[1])
                
        else:
            # Caso > 2 Grupos
            if all_normal and is_homoscedastic:
                test_name = "ANOVA (One-way)"
                _, p_val = stats.f_oneway(*group_values_list)
            elif all_normal and not is_homoscedastic:
                # ANOVA Welch no está directo en scipy simple, usamos Kruskal como fallback robusto o advertencia
                # O podríamos implementar Welch ANOVA manualmente, pero por simplicidad de esta iteración:
                test_name = "Kruskal-Wallis (Var. Desigual)" 
                _, p_val = stats.kruskal(*group_values_list)
            else:
                test_name = "Kruskal-Wallis"
                _, p_val = stats.kruskal(*group_values_list)

        # Formato P-Value
        if pd.isna(p_val):
            p_str = "-"
        elif p_val < 0.001:
            p_str = "< 0.001"
        else:
            p_str = f"{p_val:.3f}"
            
        return {
            'test_used': test_name,
            'p_value_str': p_str,
            'groups_data': groups_data
        }


    except Exception as e:
        return {'test_used': 'Error Calc', 'p_value_str': '-', 'groups_data': {}}


def calculate_categorical_stats(df: pd.DataFrame, 
                              var_col: str, 
                              group_col: Optional[str] = None) -> Dict[str, Any]:
    """
    Calcula estadísticas para una variable categórica.
    
    Args:
        df: DataFrame.
        var_col: Variable categórica de interés.
        group_col: Variable de agrupación (opcional).
        
    Returns:
        Diccionario con conteos, porcentajes y p-value (si hay grupos).
    """
    if df is None or var_col not in df.columns:
        return {'p_value_str': '-', 'test_used': 'Error', 'categories_data': {}, 'counts': {}}
        
    # Limpieza
    if group_col:
        data = df[[var_col, group_col]].dropna()
        if len(data) == 0:
            return {'p_value_str': '-', 'test_used': 'No Data', 'categories_data': {}, 'counts': {}}
    else:
        data = df[[var_col]].dropna()
        
    # Análisis Global (si no hay group)
    if not group_col:
        counts = data[var_col].value_counts()
        total = len(data)
        res = {}
        for cat, cnt in counts.items():
            pct = (cnt / total * 100) if total > 0 else 0
            res[str(cat)] = f"{cnt} ({pct:.1f}%)"
        return {'categories_data': res, 'p_value_str': '', 'test_used': ''}
        
    # Análisis Comparativo (Crosstab)
    try:
        # Tabla de contingencia: index=CategoríasVariable, columns=Grupos
        ct = pd.crosstab(data[var_col], data[group_col])
        
        # Filtro: elimino filas/col con 0 total si existen (autosaneamiento)
        ct = ct.loc[(ct!=0).any(axis=1), (ct!=0).any(axis=0)]
        
        if ct.empty or ct.shape[1] < 2:
             return {'p_value_str': '-', 'test_used': 'N/A (<2 Grupos)', 'categories_data': {}, 'counts': {}}

        # Cálculo de porcentajes por columna (Grupo)
        # axis=0 suma vertical (total del grupo)
        col_totals = ct.sum(axis=0)
        
        # Diccionario estructurado para Table 1
        # groups_data[cat_val][group_name] = "n (%)"
        categories_data = {}
        
        for cat_val in ct.index:
            row_dict = {}
            for group_name in ct.columns:
                n = ct.loc[cat_val, group_name]
                total_g = col_totals[group_name]
                pct = (n / total_g * 100) if total_g > 0 else 0
                row_dict[str(group_name)] = f"{n} ({pct:.1f}%)"
            categories_data[str(cat_val)] = row_dict
            
        # P-Value
        # Regla: Si 2x2 -> Fisher exact (opcional o si esperados < 5). 
        # Si > 2x2 o esperados bien -> Chi2.
        
        chi2, p, dof, expected = chi2_contingency(ct)
        test_name = "Chi-cuadrado"
        
        # Verificación de esperados < 5 para advertencia o Fisher
        min_expected = np.min(expected)
        if min_expected < 5:
            # Si es 2x2 podemos usar Fisher
            if ct.shape == (2, 2):
                try:
                    _, p = fisher_exact(ct)
                    test_name = "Fisher Exact"
                except:
                    test_name = "Chi2 (Warn: Exp<5)"
            else:
                test_name = "Chi2 (Warn: Exp<5)"
        
        # Formato P
        if p < 0.001:
            p_str = "< 0.001"
        else:
            p_str = f"{p:.3f}"
            
        return {
            'categories_data': categories_data,
            'p_value_str': p_str,
            'test_used': test_name,
            'table_ct': ct # Debug
        }

    except Exception as e:
        return {'p_value_str': '-', 'test_used': f'Error: {str(e)}', 'categories_data': {}}


def generate_table_one_structure(df: pd.DataFrame, 
                               variables: List[str], 
                               group_col: str) -> pd.DataFrame:
    """
    Genera la estructura de datos para una 'Tabla 1' completa (Mixta).
    Combina variables numéricas y categóricas.
    
    Args:
        df: Dataset global.
        variables: Lista de nombres de columnas a incluir como filas.
        group_col: Variable que define las columnas (Grupos).
        
    Returns:
        DataFrame formateado listo para visualizar.
    """
    if df is None or not variables or not group_col:
        return pd.DataFrame()

    # Obtener conteos de grupo para los encabezados
    # Limpiamos NaN en group_col para el conteo real
    df_clean_groups = df.dropna(subset=[group_col])
    group_counts = df_clean_groups[group_col].value_counts().to_dict()
    
    # Ordenamos grupos alfabéticamente para consistencia
    sorted_groups = sorted(group_counts.keys())
    
    # Lista para acumular filas del DataFrame final
    rows = []
    
    for var in variables:
        # Detectar tipo
        is_numeric = pd.api.types.is_numeric_dtype(df[var])
        
        if is_numeric:
            # --- Lógica Numérica ---
            res = calculate_group_comparison(df, var, group_col)
            
            # Fila: Título Variable
            # Para numéricas en papers a veces va el nombre y en la misma fila los datos si es unica metrica,
            # o filas anidadas. Usaremos el formato compacto "Media ± SD".
            
            if res.get('test_used') not in ['Error (Vars)', 'N/A (1 Grupo)']:
                # Fila 1: Media/SD
                row_mean = {'Variable/Característica': f"{var} (Media ± DE)"}
                for g in sorted_groups:
                    # groups_data keys son strings
                    g_data = res['groups_data'].get(str(g), {})
                    val = g_data.get('mean_sd', '-')
                    col_name = f"{g} (n={group_counts[g]})"
                    row_mean[col_name] = val
                
                row_mean['P-Value'] = res['p_value_str']
                row_mean['Test Usado'] = res['test_used']
                rows.append(row_mean)
                
                # Opcional: Si se quiere mediana también, se agregan más filas.
                # Por simplicidad de "Tabla 1" standard, a veces se decide según normalidad.
                # Aquí agregamos Mediana como fila extra siempre para completitud.
                row_med = {'Variable/Característica': f"   Mediana (IQR)"}
                for g in sorted_groups:
                    g_data = res['groups_data'].get(str(g), {})
                    val = g_data.get('median_iqr', '-')
                    col_name = f"{g} (n={group_counts[g]})"
                    row_med[col_name] = val
                row_med['P-Value'] = "" # Solo p-value en la primera
                row_med['Test Usado'] = ""
                rows.append(row_med)

        else:
            # --- Lógica Categórica ---
            # Asumimos que si no es numérica, la tratamos como categórica
            # Verificar si tiene pocos valores únicos (para evitar tabla gigante con texto libre)
            if df[var].nunique() > 20:
                # Skip o Advertencia
                rows.append({'Variable/Característica': f"{var} (Muchos niveles)", 'P-Value': 'N/A'})
                continue

            cat_res = calculate_categorical_stats(df, var, group_col)
            
            if cat_res.get('test_used') != 'Error':
                # Fila Encabezado Variable
                rows.append({
                    'Variable/Característica': f"**{var}**", 
                    'P-Value': cat_res.get('p_value_str', ''),
                    'Test Usado': cat_res.get('test_used', '')
                })
                
                # Filas por cada categoría
                # Orden de categorías: alfabético o frecuencia? Alfabético de values
                cats_data = cat_res.get('categories_data', {})
                sorted_cats = sorted(cats_data.keys())
                
                for cat_val in sorted_cats:
                    sub_row = {'Variable/Característica': f"   {cat_val}"}
                    group_vals = cats_data[cat_val] # dict {group: "n (%)"}
                    
                    for g in sorted_groups:
                        val = group_vals.get(str(g), "0 (0.0%)")
                        col_name = f"{g} (n={group_counts[g]})"
                        sub_row[col_name] = val
                    
                    sub_row['P-Value'] = ""
                    sub_row['Test Usado'] = ""
                    rows.append(sub_row)

    if not rows:
        return pd.DataFrame()
        
    # Crear DF y ordenar columnas
    df_final = pd.DataFrame(rows)
    
    # Asegurar orden columnas
    cols_meta = ['Variable/Característica']
    cols_groups = [f"{g} (n={group_counts[g]})" for g in sorted_groups]
    cols_stats = ['P-Value', 'Test Usado']
    
    # Filtrar solo las que existen (por si acaso safety)
    final_cols = [c for c in cols_meta + cols_groups + cols_stats if c in df_final.columns]
    
    return df_final[final_cols]

def calculate_frequency_table(series: pd.Series, sort_by_freq: bool = True) -> pd.DataFrame:
    """
    Genera tabla de frecuencia con fila de TOTAL incluida al final.
    """
    if series is None or series.empty:
        return pd.DataFrame()

    data = series.dropna()
    total_n = len(data)
    
    if total_n == 0:
        return pd.DataFrame()

    counts = data.value_counts(sort=sort_by_freq)
    percents = (counts / total_n) * 100
    
    # DataFrame Base
    df_freq = pd.DataFrame({
        'Categoría': counts.index,
        'Frecuencia (n)': counts.values,
        'Porcentaje (%)': percents.values
    })
    
    df_freq['Acumulado (%)'] = df_freq['Porcentaje (%)'].cumsum()
    
    # --- MODIFICACIÓN: AGREGAR FILA TOTAL ---
    row_total = pd.DataFrame({
        'Categoría': ['TOTAL'],
        'Frecuencia (n)': [total_n],
        'Porcentaje (%)': [100.0],
        'Acumulado (%)': [100.0]
    })
    
    return pd.concat([df_freq, row_total], ignore_index=True)

def generate_crosstab_analysis(df: pd.DataFrame, row_var: str, col_var: str, metrics: list) -> dict:
    """
    Genera una tabla de contingencia con métricas combinadas (n, %, etc.)
    y realiza el test de Chi-Cuadrado.
    """
    if df is None or row_var not in df.columns or col_var not in df.columns:
        return {'formatted_df': pd.DataFrame(), 'chi2_result': None, 'analysis_text': "Error de datos."}

    # 1. Tabla Base (Counts) con TOTAL explícito
    ct = pd.crosstab(df[row_var], df[col_var], margins=True, margins_name='TOTAL')
    
    # 2. Cálculos de Porcentajes (Safe Division)
    # Porcentaje Fila: Dividir cada celda por el total de su FILA (columna 'TOTAL')
    row_pct = ct.div(ct['TOTAL'], axis=0) * 100
    
    # Porcentaje Columna: Dividir cada celda por el total de su COLUMNA (fila 'TOTAL')
    col_pct = ct.div(ct.loc['TOTAL'], axis=1) * 100
    
    # Porcentaje Total: Dividir todo por el Gran Total (celda TOTAL, TOTAL)
    grand_total = ct.loc['TOTAL', 'TOTAL']
    total_pct = (ct / grand_total) * 100

    # 3. Construcción de Tabla Organizada (Multi-Index)
    dfs_por_grupo = {}
    
    # Orden de métricas para que siempre aparezca N primero si se selecciona
    # Mapeo: (clave_metrics, nombre_columna, dataframe_fuente, formato)
    metrics_def = [
        ('n', 'N', ct, "{:.0f}"),
        ('row_pct', '% Fila', row_pct, "{:.1f}%"),
        ('col_pct', '% Col', col_pct, "{:.1f}%"),
        ('total_pct', '% Total', total_pct, "{:.1f}%")
    ]
    
    # Filtramos qué métricas eligió el usuario
    # Si no eligió ninguna, mostramos N por defecto
    selected_metrics = [m for m in metrics_def if m[0] in metrics]
    if not selected_metrics:
        selected_metrics = [metrics_def[0]]

    # Iteramos por cada columna de la tabla de contingencia (Categorías: Hombre, Mujer, Total)
    for col_cat in ct.columns:
        # Construimos un DataFrame para esta categoría específica
        data_grupo = {}
        for _, label, df_source, fmt in selected_metrics:
            # Extraemos la columna correspondiente y aplicamos formato
            series = df_source[col_cat]
            if label == 'N':
                # Asegurar que N sea entero visualmente pero string para consistencia en visualización
                data_grupo[label] = series.apply(lambda x: f"{int(x)}")
            else:
                data_grupo[label] = series.apply(lambda x: fmt.format(x))
        
        # Guardamos el DF de este grupo
        dfs_por_grupo[col_cat] = pd.DataFrame(data_grupo)

    # Concatenamos creando el MultiIndex (Nivel 0: Categoría, Nivel 1: Métrica)
    df_display = pd.concat(dfs_por_grupo, axis=1)
    
    # Ajuste cosmético: Si 'TOTAL' está en las columnas, moverlo al final si no lo está
    if 'TOTAL' in df_display.columns.levels[0]:
        # Reordenar niveles para asegurar que TOTAL quede al final
        cols = sorted([c for c in df_display.columns.levels[0] if c != 'TOTAL']) + ['TOTAL']
        df_display = df_display.reindex(columns=cols, level=0)

    # 4. Análisis Inteligente CORREGIDO (Ignorando Totales)
    # Creamos una copia temporal sin los márgenes 'TOTAL' para buscar el máximo real
    try:
        ct_no_margins = ct.drop(index='TOTAL', columns='TOTAL', errors='ignore')
        
        # Encontrar coordenadas del máximo valor
        if ct_no_margins.empty:
            analysis_text = "Tabla vacía."
            chi2_res = None
        else:
            max_val = ct_no_margins.max().max()
            # Stack para encontrar índice y columna del máximo
            # Stack devuelve MultiIndex, idxmax devuelve tuple (row, col)
            max_pos = ct_no_margins.stack().idxmax() 
            row_max, col_max = max_pos
            
            total_sample = ct.loc['TOTAL', 'TOTAL']
            pct_max = (max_val / total_sample) * 100
            
            analysis_text = (
                f"La combinación más frecuente (excluyendo totales) es **{row_var}={row_max}** "
                f"con **{col_var}={col_max}**, representando el **{pct_max:.1f}%** del total de la muestra "
                f"($n={int(max_val)}$)."
            )
            
            # Cálculo de Chi2 (se mantiene igual)
            ct_raw = pd.crosstab(df[row_var], df[col_var])
            chi2_stat, p_val, dof, expected = stats.chi2_contingency(ct_raw)
            
            sig_text = ""
            if p_val < 0.001: sig_text = "asociación estadística altamente significativa (p < 0.001)."
            elif p_val < 0.05: sig_text = f"asociación estadística significativa (p = {p_val:.3f})."
            else: sig_text = f"no existe asociación estadística significativa (p = {p_val:.3f})."
            
            analysis_text = f"{analysis_text} Según la prueba de Chi-cuadrado, {sig_text}"
            
            chi2_res = (chi2_stat, p_val, dof, expected)

    except Exception:
        analysis_text = "No se pudo generar el análisis automático."
        chi2_res = None

    return {
        'formatted_df': df_display,
        'raw_n': ct,
        'chi2_result': chi2_res,
        'analysis_text': analysis_text 
    }


def interpret_crosstab(raw_df: pd.DataFrame, 
                       row_name: str, 
                       col_name: str, 
                       chi2_p: float) -> str:
    """
    Genera un texto inteligente interpretando la tabla de contingencia.
    """
    # 1. Encontrar celda mayoritaria (excluyendo totales si los hubiera pasado por error, 
    # pero raw_df viene sin márgenes según contrato)
    
    if raw_df.empty:
        return "No hay datos suficientes para interpretar."
        
    # Stack para tener serie multi-índice y buscar máximo
    stacked = raw_df.stack()
    if stacked.empty:
        return "Tabla vacía."
        
    max_idx = stacked.idxmax() # (Fila, Columna)
    max_val = stacked.max()
    total = stacked.sum()
    pct_max = (max_val / total * 100) if total > 0 else 0
    
    row_val, col_val = max_idx
    
    # 2. Texto Descriptivo
    desc = f"La combinación más frecuente es **{row_name}={row_val}** con **{col_name}={col_val}**, representando el **{pct_max:.1f}%** de los casos (={max_val}$)."
    
    # 3. Inferencia
    if chi2_p < 0.001:
        inf = "Existe una **asociación estadística altamente significativa** (p < 0.001)."
    elif chi2_p < 0.05:
        inf = f"Existe una **asociación estadísticamente significativa** (p = {chi2_p:.3f})."
    else:
        inf = f"No se encontró evidencia estadística de asociación (p = {chi2_p:.3f})."
        
    return f"{desc} {inf}"
