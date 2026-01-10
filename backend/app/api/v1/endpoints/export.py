"""
Export endpoint: Download cleaned dataset and audit report with premium formatting.
Provides both the final cleaned dataset and transformation audit trail.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime
from io import BytesIO
import pandas as pd

from app.internal.data_manager import data_manager
from app.core.errors import SessionNotFoundException

router = APIRouter()


@router.get("/dataset/{session_id}")
async def download_dataset(session_id: str):
    """
    Download the cleaned dataset as a premium-formatted Excel file.
    
    Returns the current state of the DataFrame as a downloadable .xlsx file
    with professional formatting: auto-adjusted columns, bold headers with
    teal background, cell borders, and frozen header row.
    
    Args:
        session_id: The session identifier
        
    Returns:
        StreamingResponse with formatted Excel file
        
    Raises:
        HTTPException 404: If session not found or expired
        HTTPException 500: If error generating Excel file
    """
    try:
        # 1. Retrieve DataFrame
        df = data_manager.get_dataframe(session_id)
        
        # 2. Retrieve Metadata (FIXED: use get_session_metadata instead of get_session)
        session_meta = data_manager.get_session_metadata(session_id)
        filename = session_meta.get("filename", "dataset_cleaned")
        
        # Remove extension if present and add .xlsx
        if "." in filename:
            filename = filename.rsplit(".", 1)[0]
        filename = f"{filename}_cleaned.xlsx"
        
        # Convert DataFrame to Excel in memory with premium formatting
        output = BytesIO()
        
        # Use xlsxwriter engine for advanced formatting
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            # Write DataFrame without index
            df.to_excel(writer, index=False, sheet_name='Cleaned Data')
            
            # Get workbook and worksheet objects
            workbook = writer.book
            worksheet = writer.sheets['Cleaned Data']
            
            # Define formats
            # Header format: Bold, teal background, borders
            header_format = workbook.add_format({
                'bold': True,
                'font_name': 'Arial',
                'font_size': 11,
                'bg_color': '#E0F2F1',  # Light teal
                'border': 1,
                'border_color': '#000000',
                'align': 'center',
                'valign': 'vcenter',
                'text_wrap': False
            })
            
            # Data cell format: Light borders, proper alignment
            cell_format = workbook.add_format({
                'font_name': 'Arial',
                'font_size': 10,
                'border': 1,
                'border_color': '#CCCCCC',
                'align': 'left',
                'valign': 'vcenter'
            })
            
            # Number format for numeric cells
            number_format = workbook.add_format({
                'font_name': 'Arial',
                'font_size': 10,
                'border': 1,
                'border_color': '#CCCCCC',
                'align': 'right',
                'valign': 'vcenter',
                'num_format': '#,##0.00'
            })
            
            # Apply header format to first row
            for col_num, column_name in enumerate(df.columns):
                worksheet.write(0, col_num, column_name, header_format)
            
            # Auto-adjust column widths based on content
            for col_num, column_name in enumerate(df.columns):
                # Calculate max length in column
                max_length = len(str(column_name))  # Start with header length
                
                # Check up to first 100 rows for performance
                sample_size = min(100, len(df))
                if sample_size > 0:
                    column_values = df[column_name].head(sample_size).astype(str)
                    max_value_length = column_values.str.len().max()
                    max_length = max(max_length, max_value_length)
                
                # Set column width (add some padding)
                # Excel column width units are approximate character widths
                adjusted_width = min(max_length + 2, 50)  # Cap at 50 for very long content
                worksheet.set_column(col_num, col_num, adjusted_width)
            
            # Apply cell formats to data rows
            for row_num in range(len(df)):
                for col_num, column_name in enumerate(df.columns):
                    cell_value = df.iloc[row_num, col_num]
                    
                    # SAFETY CHECK: Handle NaN and Infinity values
                    # xlsxwriter doesn't support these by default
                    if pd.isna(cell_value) or cell_value == float('inf') or cell_value == float('-inf'):
                        worksheet.write(row_num + 1, col_num, "", cell_format)
                    
                    # Use number format for valid numeric values
                    elif pd.api.types.is_numeric_dtype(df[column_name]):
                        worksheet.write(row_num + 1, col_num, cell_value, number_format)
                    
                    # Regular text format for everything else
                    else:
                        worksheet.write(row_num + 1, col_num, cell_value, cell_format)
            
            # Freeze the header row for easier navigation
            worksheet.freeze_panes(1, 0)
        
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    
    except SessionNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Export Error: {str(e)}")  # Log error to console
        raise HTTPException(
            status_code=500,
            detail=f"Error generating Excel file: {str(e)}"
        )


@router.get("/audit-report/{session_id}")
async def download_audit_report(session_id: str):
    """
    Download the audit report as a text file.
    
    Generates a formal academic-style report documenting all data transformations
    performed during the cleaning process. Suitable for thesis appendices.
    
    Args:
        session_id: The session identifier
        
    Returns:
        StreamingResponse with .txt file
        
    Raises:
        HTTPException 404: If session not found or expired
    """
    try:
        # 1. Retrieve Data
        df = data_manager.get_dataframe(session_id)
        
        # 2. Retrieve Metadata (FIXED: use get_session_metadata instead of get_session)
        session_meta = data_manager.get_session_metadata(session_id)
        filename = session_meta.get("filename", "dataset")
        
        audit_log = data_manager.get_audit_log(session_id)
        initial_rows = data_manager.get_initial_row_count(session_id)
        current_rows = len(df)
        
        # Calculate data loss percentage
        if initial_rows and initial_rows > 0:
            data_loss_pct = ((initial_rows - current_rows) / initial_rows) * 100
        else:
            data_loss_pct = 0.0
        
        # Generate formal report
        report_lines = [
            "=" * 70,
            "REPORTE DE TRANSFORMACIÓN DE DATOS",
            "Data Cleaning Audit Trail",
            "=" * 70,
            "",
            f"Fecha de Generación: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Archivo Original: {filename}",
            f"ID de Sesión: {session_id}",
            "",
            "=" * 70,
            "HISTORIAL DE CAMBIOS",
            "=" * 70,
            ""
        ]
        
        # Add audit log entries
        if audit_log:
            for i, entry in enumerate(audit_log, 1):
                report_lines.append(f"{i}. {entry}")
        else:
            report_lines.append("(No se registraron cambios)")
        
        report_lines.extend([
            "",
            "=" * 70,
            "RESUMEN FINAL",
            "=" * 70,
            "",
            f"Registros Iniciales: {initial_rows if initial_rows else 'N/A'}",
            f"Registros Finales: {current_rows}",
            f"Registros Eliminados: {(initial_rows - current_rows) if initial_rows else 'N/A'}",
            f"Pérdida de Datos: {data_loss_pct:.2f}%",
            f"Columnas en Dataset Final: {len(df.columns)}",
            "",
            "=" * 70,
            "COLUMNAS DEL DATASET FINAL",
            "=" * 70,
            ""
        ])
        
        # Add column names
        for i, col in enumerate(df.columns, 1):
            report_lines.append(f"{i}. {col}")
        
        report_lines.extend([
            "",
            "=" * 70,
            "FIN DEL REPORTE",
            "=" * 70,
            ""
        ])
        
        # Join all lines
        report_content = "\n".join(report_lines)
        
        # Create filename
        base_name = filename.rsplit('.', 1)[0] if '.' in filename else filename
        report_filename = f"{base_name}_audit_report.txt"
        
        # Return as downloadable file
        output = BytesIO(report_content.encode('utf-8'))
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename={report_filename}"
            }
        )
    
    except SessionNotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Audit Report Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating audit report: {str(e)}"
        )
