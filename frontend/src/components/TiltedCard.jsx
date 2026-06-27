import React, { useRef, useState } from 'react';
import './TiltedCard.css';

export default function TiltedCard({ children, className = '', maxRotation = 10, scale = 1.02 }) {
  const cardRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState('');

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Relative coordinates between -0.5 and 0.5
    const xVal = (e.clientX - rect.left) / width - 0.5;
    const yVal = (e.clientY - rect.top) / height - 0.5;
    
    // Calculate rotation angles
    const rotateY = xVal * maxRotation;
    const rotateX = -yVal * maxRotation; // Negative so it leans in correctly
    
    setTransformStyle(`scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
  };

  const handleMouseLeave = () => {
    setTransformStyle('scale(1) rotateX(0deg) rotateY(0deg)');
  };

  return (
    <div className="tilt-card-container" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div
        ref={cardRef}
        className={`tilt-card ${className}`}
        style={{ transform: transformStyle }}
      >
        <div className="tilt-card-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
