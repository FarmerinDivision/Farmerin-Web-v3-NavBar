import React from 'react';
import { useAssistant } from './AssistantContext';
import styles from '../../styles/Assistant.module.scss';
import { FaChevronDown, FaChevronUp, FaTimes, FaRedo } from 'react-icons/fa';

const AssistantHeader = () => {
  const { context, minimizeAssistant, closeAssistant, resetChat, isMinimized } = useAssistant();

  const sectionName = context?.sectionTitle || 'Farmerin';

  const handleHeaderClick = () => {
    minimizeAssistant();
  };

  return (
    <div className={styles.header} onClick={handleHeaderClick} role="button" tabIndex={0}>
      <div className={styles.headerTitleGroup}>
        <div className={styles.headerAvatar}>
          <img src="/T.I.O-ICONO.jfif" alt="Farmerin T.I.O" className={styles.headerIconImg} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.headerTitle}>Farmerin T.I.O.</h3>
          <span className={styles.headerBadge}>
            <span className={styles.activeDot}></span>
            Sección: {sectionName}
          </span>
        </div>
      </div>

      <div className={styles.headerActions}>
        {!isMinimized && (
          <button
            className={styles.iconButton}
            onClick={(e) => {
              e.stopPropagation();
              resetChat();
            }}
            title="Reiniciar conversación"
            aria-label="Reiniciar conversación"
          >
            <FaRedo size={12} />
          </button>
        )}

        <button
          className={styles.iconButton}
          onClick={(e) => {
            e.stopPropagation();
            minimizeAssistant();
          }}
          title={isMinimized ? 'Expandir' : 'Minimizar'}
          aria-label={isMinimized ? 'Expandir' : 'Minimizar'}
        >
          {isMinimized ? <FaChevronUp size={13} /> : <FaChevronDown size={13} />}
        </button>

        <button
          className={styles.iconButton}
          onClick={(e) => {
            e.stopPropagation();
            closeAssistant();
          }}
          title="Cerrar"
          aria-label="Cerrar"
        >
          <FaTimes size={14} />
        </button>
      </div>
    </div>
  );
};

export default AssistantHeader;
