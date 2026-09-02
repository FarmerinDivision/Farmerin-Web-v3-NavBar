import React from 'react';
import { useAssistant } from './AssistantContext';
import AssistantHeader from './AssistantHeader';
import AssistantChat from './AssistantChat';
import AssistantInput from './AssistantInput';
import SupportDerivationModal from './SupportDerivationModal';
import styles from '../../styles/Assistant.module.scss';
import { FaRobot } from 'react-icons/fa';

const AssistantWidget = () => {
  const { isOpen, isMinimized, toggleAssistant, context } = useAssistant();
  const sectionTitle = context?.sectionTitle || 'Farmerin';

  return (
    <>
      <div className={styles.floatingContainer}>
        {/* Floating Launcher (Closed or Minimized) */}
        {(!isOpen || isMinimized) && (
          <button
            className={styles.launcher}
            onClick={toggleAssistant}
            aria-label="Abrir Farmerin T.I.O"
          >
            <div className={styles.launcherIconCircle}>
              <div className={styles.launcherIconOriginal}>
                <img src="/T.I.O-ICONO.jfif" alt="Farmerin T.I.O" className={styles.launcherIconImg} />
              </div>
              <div className={styles.launcherIconQuestion}>
                <span>?</span>
              </div>
            </div>
            <div className={styles.launcherMessageBubbleWrapper}>
              <div className={styles.launcherMessageBubble}>
                <span className={styles.messageGreet}>
                  Hola, soy <strong className={styles.brandText}>Farmerin T.I.O.</strong>
                </span>
                <span className={styles.messagePrompt}>¿Necesitás ayuda?</span>
              </div>
            </div>
          </button>
        )}

        {/* Assistant Chat Panel (Open) */}
        {isOpen && !isMinimized && (
          <div className={styles.panelOverlay}>
            <AssistantHeader />
            <AssistantChat />
            <AssistantInput />
          </div>
        )}
      </div>

      {/* Support Derivation Modal */}
      <SupportDerivationModal />
    </>
  );
};

export default AssistantWidget;
