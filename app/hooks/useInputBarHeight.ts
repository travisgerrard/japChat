import { useState, useEffect, useRef } from 'react';

export function useInputBarHeight() {
  const [inputBarHeight, setInputBarHeight] = useState(0);
  const inputBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function updateHeight() {
      if (inputBarRef.current) {
        setInputBarHeight(inputBarRef.current.offsetHeight);
      }
    }
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return { inputBarHeight, inputBarRef };
} 