import React, { useRef, useEffect } from 'react';
import { useAssistant } from './AssistantContext';
import styles from '../../styles/Assistant.module.scss';
import { FaHeadset } from 'react-icons/fa';

const AssistantChat = () => {
  const {
    messages,
    initialOptions,
    isThinking,
    sendMessage,
    handleNavigate,
    resetChat,
    setIsSupportModalOpen
  } = useAssistant();

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const showInitialOptions = messages.length === 1 && initialOptions && initialOptions.length > 0;

  return (
    <div className={styles.chatContainer}>
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        return (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${isUser ? styles.messageUser : styles.messageAssistant}`}
          >
            <div className={styles.messageBubble}>
              {msg.text}

              {/* Render Suggested Navigation / Query Action Pills */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className={styles.actionPillsGroup}>
                  {msg.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      className={styles.actionPill}
                      onClick={() => {
                        if (action.type === 'navigate') {
                          handleNavigate(action.path);
                        } else if (action.type === 'support') {
                          setIsSupportModalOpen(true);
                        } else if (action.type === 'reset_login' || action.label === 'Reiniciar preguntas' || action.label === 'Volver al inicio') {
                          resetChat();
                        } else if (action.type === 'forgot_password') {
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('openForgotPasswordModal'));
                          }
                          if (action.text) {
                            sendMessage(action.text);
                          }
                        } else if (action.text) {
                          sendMessage(action.text);
                        }
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Render Diagnostic Options Pills */}
              {msg.diagnosticOptions && msg.diagnosticOptions.length > 0 && (
                <div className={styles.actionPillsGroup}>
                  {msg.diagnosticOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      className={styles.actionPill}
                      onClick={() => sendMessage(opt.label, opt.step)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Render Support Derivation Offer Card */}
              {msg.offerSupport && (
                <div className={styles.supportCard}>
                  <h4>¿Querés contactar a un especialista?</h4>
                  <p>Si la solución no resuelve tu caso, podemos derivar tu consulta al equipo de soporte técnico.</p>
                  <button
                    className={styles.supportButton}
                    onClick={() => setIsSupportModalOpen(true)}
                  >
                    <FaHeadset style={{ marginRight: '6px' }} />
                    Contactar a Soporte
                  </button>
                </div>
              )}
            </div>
            <span className={styles.messageTime}>{msg.timestamp}</span>
          </div>
        );
      })}

      {/* Render Adaptive Initial Options when conversation is fresh */}
      {showInitialOptions && (
        <div className={styles.initialOptionsGroup}>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0', fontWeight: 600 }}>
            Sugerencias para esta sección:
          </p>
          {initialOptions.map((opt, idx) => (
            <button
              key={idx}
              className={styles.initialOptionButton}
              onClick={() => {
                if (opt.action === 'support') {
                  setIsSupportModalOpen(true);
                } else if (opt.action === 'navigate_tambos') {
                  handleNavigate('/');
                } else if (opt.text) {
                  sendMessage(opt.text);
                }
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Typing Indicator */}
      {isThinking && (
        <div className={`${styles.messageRow} ${styles.messageAssistant}`}>
          <div className={styles.typingIndicator}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      <div ref={chatEndRef} />
    </div>
  );
};

export default AssistantChat;
