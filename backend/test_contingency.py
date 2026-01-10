"""
Script de prueba para el endpoint de Tabla de Contingencia.
Crea un dataset de ejemplo y prueba el cálculo.
"""

import pandas as pd
import requests
import json

# Configuración
BASE_URL = "http://localhost:8000/api/v1"

# 1. Crear dataset de ejemplo
print("📊 Creando dataset de ejemplo...")

data = {
    "gender": ["Male", "Female", "Male", "Female", "Male", "Female"] * 20,
    "treatment_group": ["Control", "Control", "Treatment", "Treatment", "Control", "Treatment"] * 20,
    "age": [25, 30, 35, 40, 45, 50] * 20,
    "outcome": ["Success", "Failure", "Success", "Success", "Failure", "Success"] * 20
}

df = pd.DataFrame(data)
print(f"✅ Dataset creado: {len(df)} filas, {len(df.columns)} columnas")
print(f"   Variables categóricas: {', '.join(df.select_dtypes(include='object').columns.tolist())}")

# 2. Guardar como CSV temporal
csv_path = "/tmp/test_contingency_data.csv"
df.to_csv(csv_path, index=False)
print(f"💾 CSV guardado en: {csv_path}")

# 3. Subir archivo al backend
print("\n📤 Subiendo archivo al backend...")

with open(csv_path, 'rb') as f:
    files = {'file': ('test_data.csv', f, 'text/csv')}
    upload_response = requests.post(f"{BASE_URL}/upload", files=files)

if upload_response.status_code != 200:
    print(f"❌ Error al subir archivo: {upload_response.status_code}")
    print(upload_response.text)
    exit(1)

upload_data = upload_response.json()
session_id = upload_data.get('session_id')

print(f"✅ Archivo subido exitosamente")
print(f"   Session ID: {session_id}")

# 4. Probar el endpoint de contingencia
print("\n🧪 Probando endpoint de Tabla de Contingencia...")

# Prueba 1: Gender vs Treatment Group
print("\n--- Prueba 1: Gender vs Treatment Group ---")

request_payload = {
    "session_id": session_id,
    "row_variable": "gender",
    "col_variable": "treatment_group"
}

response = requests.post(
    f"{BASE_URL}/stats/contingency",
    json=request_payload,
    headers={"Content-Type": "application/json"}
)

print(f"Status Code: {response.status_code}")

if response.status_code == 200:
    result = response.json()
    
    print(f"\n✅ SUCCESS: {result['message']}")
    print(f"\n📊 Resultados:")
    print(f"   Variables: {result['row_variable']} (filas) vs {result['col_variable']} (columnas)")
    print(f"   Total N: {result['grand_total']}")
    print(f"   Categorías filas: {result['row_categories']}")
    print(f"   Categorías columnas: {result['col_categories']}")
    
    print(f"\n📈 Tabla de Contingencia:")
    print("-" * 80)
    
    # Imprimir tabla formateada
    row_cats = result['row_categories']
    col_cats = result['col_categories']
    
    # Header
    header = f"{'':15} |"
    for col_cat in col_cats:
        header += f" {col_cat:20} |"
    header += f" {'TOTAL':20} |"
    print(header)
    print("-" * 80)
    
    # Filas
    for row_cat in row_cats:
        row_str = f"{row_cat:15} |"
        
        for col_cat in col_cats:
            cell = result['cells'][row_cat][col_cat]
            cell_str = f"N={cell['count']} ({cell['row_percent']:.1f}% / {cell['col_percent']:.1f}%)"
            row_str += f" {cell_str:20} |"
        
        # Total de fila
        row_total = result['row_totals'][row_cat]
        total_str = f"N={row_total['count']}"
        row_str += f" {total_str:20} |"
        
        print(row_str)
    
    print("-" * 80)
    
    # Fila de totales
    total_row = f"{'TOTAL':15} |"
    for col_cat in col_cats:
        col_total = result['col_totals'][col_cat]
        total_str = f"N={col_total['count']}"
        total_row += f" {total_str:20} |"
    
    total_row += f" N={result['grand_total']:20} |"
    print(total_row)
    print("-" * 80)
    
    # Ejemplo de celda detallada
    print(f"\n🔍 Ejemplo de celda (Female x Control):")
    example_cell = result['cells']['Female']['Control']
    print(f"   Count: {example_cell['count']}")
    print(f"   Row %: {example_cell['row_percent']}% (% de Female que está en Control)")
    print(f"   Col %: {example_cell['col_percent']}% (% de Control que es Female)")
    print(f"   Total %: {example_cell['total_percent']}% (% del total que es Female en Control)")
    
else:
    print(f"❌ ERROR: {response.status_code}")
    print(response.text)

# Prueba 2: Gender vs Outcome
print("\n\n--- Prueba 2: Gender vs Outcome ---")

request_payload_2 = {
    "session_id": session_id,
    "row_variable": "gender",
    "col_variable": "outcome"
}

response_2 = requests.post(
    f"{BASE_URL}/stats/contingency",
    json=request_payload_2,
    headers={"Content-Type": "application/json"}
)

if response_2.status_code == 200:
    result_2 = response_2.json()
    print(f"✅ SUCCESS: {result_2['message']}")
    print(f"   Total N: {result_2['grand_total']}")
else:
    print(f"❌ ERROR: {response_2.status_code}")
    print(response_2.text)

# Prueba 3: Error esperado (variable que no existe)
print("\n\n--- Prueba 3: Error esperado (variable inexistente) ---")

request_payload_3 = {
    "session_id": session_id,
    "row_variable": "gender",
    "col_variable": "nonexistent_variable"
}

response_3 = requests.post(
    f"{BASE_URL}/stats/contingency",
    json=request_payload_3,
    headers={"Content-Type": "application/json"}
)

if response_3.status_code == 400:
    print(f"✅ Error esperado correctamente capturado (400)")
    print(f"   Mensaje: {response_3.json()['detail']}")
else:
    print(f"⚠️  Código inesperado: {response_3.status_code}")

print("\n\n🎉 Pruebas completadas!")
print(f"🌐 Documentación interactiva disponible en: http://localhost:8000/docs")
