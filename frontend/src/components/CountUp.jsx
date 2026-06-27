import React, { useEffect, useState } from 'react';

export default function CountUp({ to, duration = 1200, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endValue = Number(to) || 0;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing out quad
      const easedProgress = progress * (2 - progress);
      
      const currentCount = Math.floor(easedProgress * endValue);
      setCount(currentCount);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [to, duration]);

  // Format currency/numbers elegantly if prefix is '$'
  const formatValue = (val) => {
    if (prefix === '$') {
      return val.toLocaleString('es-CL');
    }
    return val;
  };

  return (
    <span>
      {prefix}
      {formatValue(count)}
      {suffix}
    </span>
  );
}
