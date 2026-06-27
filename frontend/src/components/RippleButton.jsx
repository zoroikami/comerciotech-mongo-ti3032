import React, { useState, useEffect } from 'react';
import './RippleButton.css';

export default function RippleButton({ children, className = '', onClick, type = 'button', disabled = false, style = {} }) {
  const [coords, setCoords] = useState({ x: -1, y: -1 });
  const [isRippling, setIsRippling] = useState(false);

  useEffect(() => {
    if (coords.x !== -1 && coords.y !== -1) {
      setIsRippling(true);
      const timeout = setTimeout(() => setIsRippling(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [coords]);

  useEffect(() => {
    if (!isRippling) {
      setCoords({ x: -1, y: -1 });
    }
  }, [isRippling]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCoords({ x, y });
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={`btn ripple-btn ${className}`}
      disabled={disabled}
      style={{ ...style }}
      onClick={handleClick}
    >
      {isRippling ? (
        <span
          className="ripple-span"
          style={{
            left: coords.x,
            top: coords.y,
            width: '20px',
            height: '20px',
            marginLeft: '-10px',
            marginTop: '-10px'
          }}
        />
      ) : null}
      <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        {children}
      </span>
    </button>
  );
}
