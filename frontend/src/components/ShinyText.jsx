import React from 'react';
import './ShinyText.css';

export default function ShinyText({ text, className = '', style = {} }) {
  // Merging styles to specify a text shadow fallback or base coloring if needed
  const combinedStyle = {
    display: 'inline-block',
    backgroundImage: 'linear-gradient(120deg, var(--text-primary, #f3f4f6) 35%, #ffffff 50%, var(--text-primary, #f3f4f6) 65%)',
    ...style
  };

  return (
    <span className={`shiny-text ${className}`} style={combinedStyle}>
      {text}
    </span>
  );
}
