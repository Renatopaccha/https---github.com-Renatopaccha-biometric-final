import { useState } from 'react';
import { ChatSidebar } from './ai-chat/ChatSidebar';
import { ChatHeader } from './ai-chat/ChatHeader';
import { MessageList } from './ai-chat/MessageList';
import { ChatInputArea } from './ai-chat/ChatInputArea';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function AIAssistant() {
  const [activeChatId, setActiveChatId] = useState<string | null>('1');
  const [selectedModel, setSelectedModel] = useState('gemini-pro');
  const [chatTitle, setChatTitle] = useState('Análisis de correlación IMC');
  const [isLoading, setIsLoading] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: '¿Puedes ayudarme a interpretar una correlación de Pearson de 0.854 con p < 0.001 entre Peso e IMC?',
      timestamp: 'hace 2 horas'
    },
    {
      id: '2',
      role: 'assistant',
      content: `¡Por supuesto! Te ayudo a interpretar esta correlación:

**Interpretación del coeficiente de Pearson (r = 0.854):**

1. **Magnitud de la correlación**: Un valor de 0.854 indica una correlación **positiva muy fuerte** entre Peso e IMC. Esto significa que a medida que aumenta el peso, el IMC también tiende a aumentar de manera consistente.

2. **Significancia estadística (p < 0.001)**: El p-valor extremadamente bajo indica que esta correlación es **estadísticamente significativa**. La probabilidad de que esta correlación sea producto del azar es menor al 0.1%.

3. **Interpretación práctica**: 
   - Existe una relación lineal muy fuerte entre ambas variables
   - Aproximadamente el 73% de la variabilidad en el IMC puede explicarse por el peso (r² = 0.729)
   - Esta correlación tiene sentido desde el punto de vista teórico, ya que el IMC se calcula directamente a partir del peso

**Recomendaciones:**
- ✅ Esta correlación es válida para reportar en un estudio
- 📊 Podrías complementar con un gráfico de dispersión
- ⚠️ Recuerda: correlación no implica causalidad

¿Necesitas ayuda con algún otro análisis estadístico?`,
      timestamp: 'hace 2 horas'
    }
  ]);

  const handleNewChat = () => {
    setActiveChatId(null);
    setChatTitle('Nuevo Chat');
    setMessages([]);
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    // In a real app, you would load the chat history from a database
    setChatTitle('Análisis de correlación IMC');
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!content && !files) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: files && files.length > 0 
        ? `${content}\n\n📎 Archivos adjuntos: ${files.map(f => f.name).join(', ')}`
        : content,
      timestamp: 'Ahora'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response (In production, this would call the Gemini API)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `He recibido tu pregunta: "${content}". ${files && files.length > 0 ? `También he analizado los ${files.length} archivo(s) que adjuntaste.` : ''}\n\nEn una implementación real, aquí procesaría tu solicitud usando la API de Google Gemini y te proporcionaría un análisis detallado basado en tus datos biomédicos.\n\n**Capacidades disponibles:**\n- Análisis estadístico descriptivo\n- Interpretación de pruebas de hipótesis\n- Sugerencias de métodos apropiados\n- Visualización de resultados\n- Análisis de imágenes y gráficos\n\n¿En qué más puedo ayudarte?`,
        timestamp: 'Ahora'
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="h-full flex bg-slate-50">
      {/* Left Sidebar - 25% width */}
      <div className="w-1/4 min-w-[280px] max-w-[400px]">
        <ChatSidebar
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          activeChatId={activeChatId}
        />
      </div>

      {/* Main Chat Area - 75% width */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <ChatHeader
          chatTitle={chatTitle}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />

        {/* Messages */}
        <MessageList messages={messages} isLoading={isLoading} />

        {/* Input */}
        <ChatInputArea onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
