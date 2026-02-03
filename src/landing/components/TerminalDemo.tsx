import { useState, useEffect, useRef } from 'react';
import { Box, Title, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

interface TerminalLine {
  text: string;
  type: 'normal' | 'highlight' | 'success' | 'dim';
  delay: number;
}

const terminalLines: TerminalLine[] = [
  { text: '> Input: imagen.png', type: 'normal', delay: 0 },
  { text: '  → height map generado', type: 'highlight', delay: 800 },
  { text: '> Layers: planificando cambios de color...', type: 'normal', delay: 1600 },
  { text: '> Export: generando STL', type: 'normal', delay: 2400 },
  { text: '                              → hecho.', type: 'success', delay: 3200 },
  { text: '', type: 'normal', delay: 3600 },
  { text: 'ok: color plan exported', type: 'success', delay: 4000 },
];

function TypingText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    if (text.length === 0) {
      setIsComplete(true);
      onComplete?.();
      return;
    }
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        onComplete?.();
        clearInterval(interval);
      }
    }, 30);
    
    return () => clearInterval(interval);
  }, [text, onComplete]);
  
  return (
    <span>
      {displayText}
      {!isComplete && <span className="typing-cursor" />}
    </span>
  );
}

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Intersection observer to trigger animation when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView) {
          setIsInView(true);
        }
      },
      { threshold: 0.3 }
    );
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    
    return () => observer.disconnect();
  }, [isInView]);
  
  // Trigger line animations
  useEffect(() => {
    if (!isInView) return;
    
    terminalLines.forEach((line, index) => {
      setTimeout(() => {
        setVisibleLines(prev => [...prev, index]);
      }, line.delay);
    });
  }, [isInView]);
  
  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'highlight': return '#6CFF9A';
      case 'success': return '#1FAE7A';
      case 'dim': return '#4A6B61';
      default: return '#6B8F83';
    }
  };
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <section ref={sectionRef} className="landing-section">
      <Stack gap={isMobile ? "lg" : "xl"} align="center">
        <Box className="terminal" style={{ maxWidth: 600, width: '100%' }}>
          {/* Terminal header */}
          <Box mb={isMobile ? "sm" : "md"} style={{ display: 'flex', gap: isMobile ? 6 : 8 }}>
            <Box style={{ width: isMobile ? 10 : 12, height: isMobile ? 10 : 12, borderRadius: '50%', background: '#ff5f56' }} />
            <Box style={{ width: isMobile ? 10 : 12, height: isMobile ? 10 : 12, borderRadius: '50%', background: '#ffbd2e' }} />
            <Box style={{ width: isMobile ? 10 : 12, height: isMobile ? 10 : 12, borderRadius: '50%', background: '#27ca40' }} />
          </Box>
          
          {/* Terminal content */}
          <Box style={{ minHeight: isMobile ? 150 : 200 }}>
            {terminalLines.map((line, index) => (
              <Box
                key={index}
                className="terminal__line"
                style={{
                  color: getLineColor(line.type),
                  opacity: visibleLines.includes(index) ? 1 : 0,
                  animationDelay: `${index * 0.1}s`,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: isMobile ? '0.75rem' : '0.9rem',
                  minHeight: '1.5em',
                }}
              >
                {visibleLines.includes(index) && (
                  <TypingText text={line.text} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
        
        <Title 
          order={2} 
          size={isMobile ? "1.5rem" : "2.5rem"}
          ta="center"
          c="white"
          style={{ 
            fontStyle: 'italic',
            fontWeight: 400,
          }}
        >
          It's done, isn't it?
        </Title>
      </Stack>
    </section>
  );
}
