"""
AI Service for Google Gemini integration.
Handles chat interactions with session-aware context injection and multimodal file processing.
"""

import base64
import io
from typing import List, Optional, Tuple
import pandas as pd
from PIL import Image
from docx import Document
import google.generativeai as genai

from app.core.config import settings
from app.core.errors import BiometricException
from app.internal.data_manager import data_manager


class AIService:
    """
    Service for AI-powered biostatistical assistance using Google Gemini.
    
    Features:
    - Session-aware context injection from active DataFrames
    - Multimodal file processing (images, Word, Excel)
    - Biostatistics tutor persona
    """
    
    def __init__(self):
        """Initialize Gemini client with API key and safety settings."""
        if not settings.gemini_api_key:
            raise BiometricException(
                message="GEMINI_API_KEY not configured in environment variables",
                status_code=500
            )
        
        genai.configure(api_key=settings.gemini_api_key)
        
        # Configure safety settings for scientific/medical content
        self.safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE"
            }
        ]
        
        self.model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            safety_settings=self.safety_settings
        )
    
    def _build_system_prompt(self, session_context: Optional[str] = None) -> str:
        """
        Build dynamic system prompt with biostatistics expertise and optional session context.
        
        Args:
            session_context: DataFrame metadata and preview from current session
            
        Returns:
            Complete system prompt for the AI
        """
        base_prompt = """Eres un tutor experto en bioestadística y análisis de datos biomédicos. Tu objetivo es ayudar a estudiantes e investigadores a:

1. **Elegir pruebas estadísticas apropiadas** basándose en el tipo de datos y la pregunta de investigación
2. **Interpretar resultados estadísticos** (p-valores, intervalos de confianza, tamaños de efecto)
3. **Detectar problemas en los datos** (valores atípicos, normalidad, homocedasticidad)
4. **Recomendar métodos de limpieza** para valores faltantes y duplicados
5. **Explicar conceptos estadísticos** de manera clara y pedagógica

**Directrices:**
- Sé claro, conciso y educativo
- Usa ejemplos prácticos del contexto biomédico
- Explica los supuestos de cada prueba estadística
- Sugiere visualizaciones apropiadas
- Advierte sobre errores comunes (p-hacking, correlación vs causalidad)
- Incluye referencias a métodos paramétricos y no paramétricos cuando sea relevante
- Formatea código estadístico en bloques cuando sea apropiado (Python/Pandas/SciPy)

"""
        
        if session_context:
            base_prompt += f"\n**CONTEXTO DE LA SESIÓN ACTUAL:**\n{session_context}\n\n"
            base_prompt += "**IMPORTANTE:** El usuario tiene estos datos cargados. Cuando hagas sugerencias, menciona las columnas específicas que están disponibles. No inventes nombres de columnas que no existen.\n\n"
        
        return base_prompt
    
    def _get_session_context(self, session_id: str) -> Optional[str]:
        """
        Retrieve DataFrame metadata and preview from session.
        
        Args:
            session_id: Active session identifier
            
        Returns:
            Formatted string with DataFrame information or None if session invalid
        """
        try:
            df = data_manager.get_dataframe(session_id)
            
            # Build context string
            context_parts = [
                f"📊 **Dataset cargado:** {len(df)} filas × {len(df.columns)} columnas\n",
                f"**Columnas disponibles:**"
            ]
            
            # List columns with data types
            for col in df.columns:
                dtype = df[col].dtype
                null_count = df[col].isnull().sum()
                null_pct = (null_count / len(df) * 100)
                
                # Classify data type for user
                if pd.api.types.is_numeric_dtype(df[col]):
                    type_label = "numérica"
                elif pd.api.types.is_datetime64_any_dtype(df[col]):
                    type_label = "fecha/hora"
                else:
                    type_label = "categórica/texto"
                
                context_parts.append(
                    f"  - `{col}` ({type_label}, {dtype}) - {null_pct:.1f}% nulos"
                )
            
            # Add data preview (first 5 rows)
            context_parts.append(f"\n**Vista previa (primeras 5 filas):**")
            context_parts.append("```")
            context_parts.append(df.head(5).to_string())
            context_parts.append("```")
            
            # Add basic statistics for numeric columns
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            if numeric_cols:
                context_parts.append(f"\n**Estadísticas descriptivas (columnas numéricas):**")
                context_parts.append("```")
                context_parts.append(df[numeric_cols].describe().to_string())
                context_parts.append("```")
            
            return "\n".join(context_parts)
            
        except Exception as e:
            # Session might be expired or invalid
            return None
    
    def _validate_file(self, file_content: bytes, filename: str) -> None:
        """
        Validate file size and type.
        
        Args:
            file_content: File bytes
            filename: Original filename
            
        Raises:
            BiometricException: If file is invalid
        """
        # Check size
        size_mb = len(file_content) / (1024 * 1024)
        if size_mb > settings.max_ai_file_size_mb:
            raise BiometricException(
                message=f"File '{filename}' exceeds maximum size of {settings.max_ai_file_size_mb}MB",
                status_code=400
            )
        
        # Check extension
        allowed_extensions = ['.png', '.jpg', '.jpeg', '.docx', '.xlsx', '.xls']
        if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
            raise BiometricException(
                message=f"File type not supported. Allowed: {', '.join(allowed_extensions)}",
                status_code=400
            )
    
    def _process_image(self, file_content: bytes, filename: str) -> Tuple[Image.Image, str]:
        """
        Process image file for Gemini API.
        
        Args:
            file_content: Image bytes
            filename: Original filename
            
        Returns:
            Tuple of (PIL Image, description text)
        """
        try:
            image = Image.open(io.BytesIO(file_content))
            
            # Convert RGBA to RGB if necessary
            if image.mode == 'RGBA':
                image = image.convert('RGB')
            
            description = f"📷 Imagen adjunta: {filename}"
            return image, description
            
        except Exception as e:
            raise BiometricException(
                message=f"Failed to process image '{filename}': {str(e)}",
                status_code=400
            )
    
    def _process_docx(self, file_content: bytes, filename: str) -> str:
        """
        Extract text from Word document.
        
        Args:
            file_content: Document bytes
            filename: Original filename
            
        Returns:
            Extracted text with formatting
        """
        try:
            doc = Document(io.BytesIO(file_content))
            
            text_parts = [f"📄 **Documento Word adjunto: {filename}**\n"]
            
            # Extract paragraphs
            for para in doc.paragraphs:
                if para.text.strip():
                    text_parts.append(para.text)
            
            # Extract text from tables
            for table in doc.tables:
                text_parts.append("\n[Tabla detectada]")
                for row in table.rows:
                    row_text = " | ".join([cell.text for cell in row.cells])
                    text_parts.append(row_text)
            
            return "\n".join(text_parts)
            
        except Exception as e:
            raise BiometricException(
                message=f"Failed to process Word document '{filename}': {str(e)}",
                status_code=400
            )
    
    def _process_excel(self, file_content: bytes, filename: str) -> str:
        """
        Read Excel file and convert to markdown table.
        
        Args:
            file_content: Excel bytes
            filename: Original filename
            
        Returns:
            Markdown-formatted table (limited to first 50 rows)
        """
        try:
            # Read Excel file
            df = pd.read_excel(io.BytesIO(file_content))
            
            # Limit rows for performance
            max_rows = 50
            if len(df) > max_rows:
                df_preview = df.head(max_rows)
                truncation_note = f"\n\n*(Mostrando primeras {max_rows} filas de {len(df)} totales)*"
            else:
                df_preview = df
                truncation_note = ""
            
            # Convert to markdown
            markdown = f"📊 **Archivo Excel adjunto: {filename}**\n\n"
            markdown += df_preview.to_markdown(index=False)
            markdown += truncation_note
            
            return markdown
            
        except Exception as e:
            raise BiometricException(
                message=f"Failed to process Excel file '{filename}': {str(e)}",
                status_code=400
            )
    
    async def chat(
        self,
        message: str,
        session_id: Optional[str] = None,
        history: List[dict] = None,
        files: List[Tuple[bytes, str]] = None
    ) -> dict:
        """
        Generate AI response with optional session context and file attachments.
        
        Args:
            message: User's message
            session_id: Optional session ID for DataFrame context
            history: Previous conversation messages
            files: List of (file_content, filename) tuples
            
        Returns:
            Dict with response, context_used flag, and files_processed count
        """
        try:
            # Get session context if available
            session_context = None
            if session_id:
                session_context = self._get_session_context(session_id)
            
            # Build system prompt
            system_prompt = self._build_system_prompt(session_context)
            
            # Process uploaded files
            file_contents = []
            files_processed = 0
            
            if files:
                for file_content, filename in files:
                    # Validate file
                    self._validate_file(file_content, filename)
                    
                    # Process based on type
                    if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                        image, description = self._process_image(file_content, filename)
                        file_contents.append(image)
                        message += f"\n\n{description}"
                        files_processed += 1
                        
                    elif filename.lower().endswith('.docx'):
                        text = self._process_docx(file_content, filename)
                        message += f"\n\n{text}"
                        files_processed += 1
                        
                    elif filename.lower().endswith(('.xlsx', '.xls')):
                        table = self._process_excel(file_content, filename)
                        message += f"\n\n{table}"
                        files_processed += 1
            
            # Build conversation history for context
            conversation_parts = [system_prompt]
            
            if history:
                for msg in history:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    
                    if role == "user":
                        conversation_parts.append(f"Usuario: {content}")
                    else:
                        conversation_parts.append(f"Asistente: {content}")
            
            # Add current user message
            conversation_parts.append(f"Usuario: {message}")
            
            # Combine text and images
            full_prompt = "\n\n".join(conversation_parts)
            
            # Generate response
            if file_contents:
                # Multimodal request (text + images)
                response = self.model.generate_content(
                    [full_prompt] + file_contents,
                    generation_config={
                        "temperature": settings.ai_temperature,
                        "top_p": 0.95,
                        "top_k": 40,
                        "max_output_tokens": 2048,
                    }
                )
            else:
                # Text-only request
                response = self.model.generate_content(
                    full_prompt,
                    generation_config={
                        "temperature": settings.ai_temperature,
                        "top_p": 0.95,
                        "top_k": 40,
                        "max_output_tokens": 2048,
                    }
                )
            
            return {
                "success": True,
                "response": response.text,
                "session_context_used": session_context is not None,
                "files_processed": files_processed,
                "error": None
            }
            
        except BiometricException:
            # Re-raise our custom exceptions
            raise
            
        except Exception as e:
            # Handle any other errors gracefully
            error_msg = str(e)
            
            # Check for common API errors
            if "API_KEY" in error_msg.upper():
                error_msg = "API key inválida o no configurada. Verifica GEMINI_API_KEY en variables de entorno."
            elif "QUOTA" in error_msg.upper() or "RATE_LIMIT" in error_msg.upper():
                error_msg = "Límite de uso de la API alcanzado. Intenta nuevamente en unos minutos."
            
            return {
                "success": False,
                "response": "Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente.",
                "session_context_used": False,
                "files_processed": 0,
                "error": error_msg
            }



# Singleton instance - only instantiate if API key is configured
ai_service = None
try:
    if settings.gemini_api_key:
        ai_service = AIService()
except Exception as e:
    # AI service not available, but don't crash the server
    print(f"Warning: AI Service not initialized: {e}")
    ai_service = None

