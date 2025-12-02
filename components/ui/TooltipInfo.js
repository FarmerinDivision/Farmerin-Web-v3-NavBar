import React, { useState } from "react";
import styles from "../../styles/TooltipInfo.module.scss";

const TooltipInfo = ({ label, title, description }) => {
  const [show, setShow] = useState(false);

  return (
    <div
      className={styles.tooltipWrapper}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0} // para accesibilidad / focus
      role="button"
      aria-haspopup="true"
      aria-expanded={show}
    >
      <span className={styles.tooltipLabel}>{label}</span>

      <div
        className={styles.tooltipBox}
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "translate(-50%, 0)" : "translate(-50%, 12px)",
          pointerEvents: show ? "auto" : "none",
        }}
      >
        <p className={styles.tooltipTitle}>{title}</p>
        <p className={styles.tooltipDesc}>{description}</p>
      </div>
    </div>
  );
};

export default TooltipInfo;
