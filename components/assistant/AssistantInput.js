import React, { useState } from 'react';
import { useAssistant } from './AssistantContext';
import styles from '../../styles/Assistant.module.scss';
import { FaPaperPlane } from 'react-icons/fa';

const AssistantInput = () => {
  const [text, setText] = useState('');
  const { sendMessage, isThinking } = useAssistant();

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || isThinking) return;

    sendMessage(text.trim(), null, true);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSend(e);
    }
  };

  return (
    <form className={styles.inputContainer} onSubmit={handleSend}>
      <input
        type="text"
        className={styles.inputField}
        placeholder="Escribí tu pregunta sobre Farmerin..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isThinking}
      />
      <button
        type="submit"
        className={styles.sendButton}
        disabled={!text.trim() || isThinking}
        title="Enviar mensaje"
      >
        <FaPaperPlane size={14} />
      </button>
    </form>
  );
};

export default AssistantInput;
