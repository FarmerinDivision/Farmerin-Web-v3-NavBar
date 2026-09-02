import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FirebaseContext } from '../../firebase2';
import { resolveContext } from '../../lib/assistant/contextResolver';

const AssistantContext = createContext();

export const AssistantProvider = ({ children }) => {
  const router = useRouter();
  const firebaseContext = useContext(FirebaseContext) || {};
  const { tamboSel, usuario } = firebaseContext;

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(null);

  const [context, setContext] = useState(() => resolveContext(router?.pathname || '/', {
    tamboId: tamboSel?.id,
    tamboName: tamboSel?.nombre,
    usuario
  }));

  const buildWelcomeText = (ctx) => {
    if (ctx?.section === 'login') {
      return 'Hola, soy Farmerin T.I.O. ¿Necesitás ayuda para iniciar sesión en Farmerin?';
    }
    if (ctx?.section === 'farmerin_tio' || ctx?.path === '/farmerin-tio') {
      return 'No voy a responder consultas en esta sección porque aquí podés consultar toda la información sobre de qué trata el bot.\n\nSi necesitás ayuda o comunicarte con nuestro equipo, podés hacer clic en el botón de soporte a continuación:';
    }
    const sectionName = ctx?.sectionTitle || 'Farmerin';
    return `Hola, soy **Farmerin T.I.O.** ¿Necesitás ayuda en ${sectionName}?`;
  };

  const [messages, setMessages] = useState([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: 'Hola, soy **Farmerin T.I.O.** ¿Necesitás ayuda?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isInitial: true
    }
  ]);

  const [initialOptions, setInitialOptions] = useState([]);

  // Auto-update context when path or active tambo changes
  useEffect(() => {
    const updatedContext = resolveContext(router?.pathname || '/', {
      tamboId: tamboSel?.id,
      tamboName: tamboSel?.nombre,
      usuario
    });
    setContext(updatedContext);

    // Fetch initial options for updated context section
    fetchInitialOptions(updatedContext);

    // Dynamically update welcome message text if it's the only message in the chat
    setMessages(prev => {
      if (prev.length === 1 && prev[0].isInitial) {
        return [
          {
            ...prev[0],
            text: buildWelcomeText(updatedContext)
          }
        ];
      }
      return prev;
    });
  }, [router?.pathname, tamboSel, usuario]);

  async function fetchInitialOptions(currentContext) {
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'GET_INITIAL_OPTIONS',
          context: currentContext
        })
      });
      const data = await res.json();
      if (data.success && data.options) {
        setInitialOptions(data.options);
      }
    } catch (err) {
      console.error('Error fetching initial options:', err);
    }
  }

  const toggleAssistant = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const minimizeAssistant = () => {
    setIsMinimized(!isMinimized);
  };

  const closeAssistant = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const resetChat = () => {
    setSearchMode(null);
    setMessages([
      {
        id: `msg_${Date.now()}`,
        sender: 'assistant',
        text: buildWelcomeText(context),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isInitial: true
      }
    ]);
  };

  const sendMessage = async (text, diagnosticStep = null, isManualInput = false) => {
    if (!text && !diagnosticStep) return;

    const userMsgId = `usr_${Date.now()}`;
    if (text) {
      const userMsg = {
        id: userMsgId,
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg]);
    }

    setIsThinking(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          context,
          diagnosticStep,
          isManualInput,
          searchMode
        })
      });

      const data = await response.json();
      setIsThinking(false);

      if (data.success) {
        if (data.searchMode !== undefined) {
          setSearchMode(data.searchMode);
        }
        if (data.resetFlow) {
          resetChat();
          return;
        }
        const assistantMsg = {
          id: `ast_${Date.now()}`,
          sender: 'assistant',
          text: data.responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intent: data.intent,
          suggestedActions: data.suggestedActions || [],
          diagnosticOptions: data.diagnosticOptions || [],
          offerSupport: data.offerSupport || false
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `ast_err_${Date.now()}`,
            sender: 'assistant',
            text: 'Ocurrió un error al procesar tu respuesta. Por favor, intentá nuevamente.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error('Error sending message to assistant:', err);
      setIsThinking(false);
      setMessages(prev => [
        ...prev,
        {
          id: `ast_err_${Date.now()}`,
          sender: 'assistant',
          text: 'No se pudo establecer conexión con el asistente. Verificá tu red e intentá nuevamente.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const handleNavigate = (path) => {
    if (path) {
      router.push(path);
    }
  };

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        isMinimized,
        isThinking,
        context,
        messages,
        initialOptions,
        isSupportModalOpen,
        toggleAssistant,
        minimizeAssistant,
        closeAssistant,
        resetChat,
        sendMessage,
        handleNavigate,
        setIsSupportModalOpen
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => useContext(AssistantContext);
export default AssistantContext;
