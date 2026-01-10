"""
Módulo de Validaciones y Seguridad (BioStat Easy)
-------------------------------------------------
Este módulo centraliza todas las validaciones de datos, parámetros y estructuras
para asegurar la robustez de los análisis estadísticos. 
Todas las funciones retornan una tupla (is_valid: bool, msg: str).

Responsabilidades:
- Validación de conteo y tipo de variables.
- Verificación de integridad de columnas y DataFrames.
- Validaciones específicas de parámetros estadísticos (alpha, clusters).
- Restricciones de seguridad para gráficos.

Autor: BioStat Easy Team
Versión: 2.5
"""

import numpy as np
import pandas as pd
import streamlit as st
from typing import Tuple, List, Optional, Union, Any

# ==============================================================================
# 1. VALIDACIÓN DE VARIABLES (INPUT DEL USUARIO)
# ==============================================================================

def validate_and_truncate_variables(selected_vars: List[str], 
                                  max_allowed: int, 
                                  context: str, 
                                  vartype: str = "variables") -> Tuple[List[str], str]:
    """
    Valida y trunca una lista de variables seleccionadas si excede el máximo.
    Retorna la lista truncada y un mensaje de advertencia si aplica.
    Nota: Retorno diferente al estándar (lista, mensaje).
    """
    if not selected_vars:
        return [], ""
        
    if len(selected_vars) > max_allowed:
        truncated = selected_vars[:max_allowed]
        msg = f"⚠️ Se han seleccionado demasiadas {vartype} para {context}. Se analizarán solo las primeras {max_allowed}."
        return truncated, msg
        
    return selected_vars, ""


def validate_variable_count(nvars: int, 
                          max_allowed: int, 
                          context: str, 
                          critical: bool = False) -> Tuple[bool, str]:
    """
    Valida si el número de variables es aceptable.
    """
    if nvars == 0:
        if critical:
            return False, f"⚠️ Debes seleccionar al menos una variable para {context}."
        return True, "" # A veces 0 es válido si es opcional
        
    if nvars > max_allowed:
        return False, f"⚠️ Máximo {max_allowed} variables permitidas para {context} (seleccionadas: {nvars})."
        
    return True, "OK"


def check_sample_requirements(n: int, 
                            min_required: int, 
                            context: str) -> Tuple[bool, str]:
    """
    Verifica si el tamaño de muestra es suficiente.
    """
    if n < min_required:
        return False, f"⚠️ Tamaño de muestra insuficiente para {context}. Mínimo requerido: {min_required}, Actual: {n}."
    return True, "OK"


# ==============================================================================
# 2. VALIDACIÓN DE COLUMNAS
# ==============================================================================

def validate_column_numeric(df: pd.DataFrame, col: str) -> Tuple[bool, str]:
    """Valida si una columna es numérica."""
    if col not in df.columns:
        return False, f"Columna '{col}' no encontrada."
        
    if not pd.api.types.is_numeric_dtype(df[col]):
        return False, f"La variable '{col}' debe ser numérica."
        
    return True, "OK"


def validate_column_categorical(df: pd.DataFrame, col: str) -> Tuple[bool, str]:
    """Valida si una columna es categórica (object, category, string)."""
    if col not in df.columns:
        return False, f"Columna '{col}' no encontrada."
        
    # Check if object, category or string
    is_cat = pd.api.types.is_object_dtype(df[col]) or \
             pd.api.types.is_categorical_dtype(df[col]) or \
             pd.api.types.is_string_dtype(df[col])
             
    if not is_cat:
        # A veces numéricos con pocos valores se tratan como categóricos, pero aquí validamos tipo estricto
        return False, f"La variable '{col}' debe ser categórica."
        
    return True, "OK"


def validate_column_for_analysis(df: pd.DataFrame, col: str) -> Tuple[bool, str]:
    """
    Validación general de utilidad de columna (no vacía, varianza > 0).
    """
    if col not in df.columns:
        return False, f"Columna '{col}' no existe."
        
    s = df[col]
    if s.isna().all():
        return False, f"La columna '{col}' está vacía."
    
    if s.nunique(dropna=True) <= 1 and len(s) > 1:
        # Warning técnico pero permite análisis a veces
        return True, f"Nota: La variable '{col}' es constante (un solo valor)." 
        
    return True, "OK"


# ==============================================================================
# 3. VALIDACIÓN DE DATOS (DATASETS)
# ==============================================================================

def validate_data_for_analysis(df: pd.DataFrame, *args, **kwargs) -> Tuple[bool, str]:
    """
    Valida si el DataFrame es apto para análisis estadístico (Versión UI).
    Retorna (True, "") si es válido, o (False, "mensaje error") si no.
    """
    if df is None:
        st.warning("⚠️ No hay datos cargados en memoria.")
        return False, "No Data"
        
    if df.empty:
        st.error("❌ El set de datos está vacío.")
        return False, "Empty Data"

    if len(df.columns) < 2:
        st.error("❌ Se necesitan al menos 2 columnas para pruebas de hipótesis.")
        return False, "Insufficient Columns"
        
    return True, "OK"


def validate_data_input(data: Any, minsize: int = 2) -> Tuple[bool, str]:
    """
    Valida inputs tipo array/lista.
    """
    try:
        arr = np.array(data)
        # Eliminar nans para contar tamaño efectivo
        if arr.dtype.kind in 'fi': # Float or int
             arr = arr[~np.isnan(arr)]
             
        if len(arr) < minsize:
            return False, f"Input contiene menos de {minsize} datos válidos."
    except:
        return False, "Formato de datos inválido."
        
    return True, "OK"


# ==============================================================================
# 4. SEGURIDAD DE GRÁFICOS
# ==============================================================================

def safe_figure_size(nitems: int, 
                   max_width: int = 16, 
                   max_height: int = 12) -> Tuple[int, int]:
    """
    Calcula dimensiones seguras para figuras basadas en número de items.
    Retorna (width, height).
    """
    # Base size
    w = min(max(8, nitems * 0.5), max_width)
    h = min(max(6, nitems * 0.3), max_height)
    
    return int(w), int(h)


def validate_figure_dimensions(width: float, height: float) -> Tuple[bool, str]:
    """
    Valida que las dimensiones no rompan el layout o memoria.
    """
    if width <= 0 or height <= 0:
        return False, "Dimensiones deben ser positivas."
        
    if width > 50 or height > 50:
        return False, "Dimensiones de figura demasiado grandes (>50 pulgadas)."
        
    return True, "OK"


# ==============================================================================
# 5. VALIDACIÓN DE PARÁMETROS ESTADÍSTICOS
# ==============================================================================

def validate_alpha_level(alpha: float) -> Tuple[bool, str]:
    """Valida nivel de significancia alpha."""
    if not (0 < alpha < 0.5):
        return False, "El nivel Alpha debe estar entre 0.0 y 0.5 (usualmente 0.05)."
    return True, "OK"


def validate_percentiles(percentiles: List[float]) -> Tuple[bool, str]:
    """Valida lista de percentiles (0-1)."""
    if not percentiles:
        return False, "Lista de percentiles vacía."
        
    for p in percentiles:
        if not (0 <= p <= 1):
            return False, f"Percentil inválido: {p}. Debe estar entre 0 y 1."
            
    return True, "OK"


def validate_clustering_params(n_clusters: int, n_samples: int) -> Tuple[bool, str]:
    """Valida parámetros para K-Means/Clustering."""
    if n_clusters < 2:
        return False, "Se requieren al menos 2 clusters."
        
    if n_clusters >= n_samples:
        return False, "El número de clusters no puede igualar o exceder el número de muestras."
        
    return True, "OK"


def validate_time_event_columns(df: pd.DataFrame, 
                              col_time: str, 
                              col_event: str) -> Tuple[bool, str]:
    """Valida columnas para supervivencia."""
    if col_time not in df.columns or col_event not in df.columns:
        return False, "Columnas de Tiempo o Evento no encontradas."
        
    # Simple type check
    if not pd.api.types.is_numeric_dtype(df[col_time]):
        return False, "La variable Tiempo debe ser numérica."
        
    # Event check loose
    if df[col_event].dropna().nunique() > 2:
        return False, "La variable Evento debe ser binaria (o constante)."
        
    return True, "OK"


def validate_groups_for_comparison(group_data_list: List[Any]) -> Tuple[bool, str]:
    """Valida lista de grupos para pruebas como ANOVA."""
    if len(group_data_list) < 2:
        return False, "Se requieren al menos 2 grupos para comparar."
        
    for i, g in enumerate(group_data_list):
         g_clean = pd.to_numeric(g, errors='coerce').dropna()
         if len(g_clean) < 2:
             return False, f"El grupo {i+1} tiene menos de 2 observaciones válidas."
             
    return True, "OK"
