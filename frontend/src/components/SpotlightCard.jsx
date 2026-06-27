import React, { useRef } from 'react';
import './SpotlightCard.css';

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(157, 78, 221, 0.15)' }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`spotlight-card ${className}`}
      style={{ '--spotlight-color': spotlightColor }}
    >
      <div className="spotlight-card-content">
        {children}
      </div>
    </div>
  );
}
