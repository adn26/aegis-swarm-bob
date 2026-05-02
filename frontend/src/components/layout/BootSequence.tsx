import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface BootSequenceProps {
  onComplete: () => void;
}

function BootSequence({ onComplete }: BootSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // 1. Wordmark fades in
    tl.to(wordmarkRef.current, { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, 0.3)

    // 2. Boot lines stagger in one by one
      .to('.boot-line', {
        opacity: 1,
        stagger: 0.12,
        duration: 0.01,
        ease: 'none'
      }, 0.9)

    // 3. Short hold
      .addLabel('holdBoot', '+=0.5')

    // 4. Scan line sweeps down
      .set(scanLineRef.current, { top: '-2px', opacity: 1 }, 'holdBoot')
      .to(scanLineRef.current, {
        top: '100vh',
        duration: 0.7,
        ease: 'power1.inOut'
      }, 'holdBoot')

    // 5. Intro fades out (slightly after scan starts)
      .to(containerRef.current, {
        opacity: 0,
        duration: 0.35,
        ease: 'power1.in',
        onComplete: onComplete
      }, 'holdBoot+=0.45');

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  return (
    <>
      <div id="scan-line" ref={scanLineRef} style={{
        position: 'fixed', left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(200,168,75,0.35), transparent)',
        opacity: 0, pointerEvents: 'none', zIndex: 101
      }}></div>
      
      <div ref={containerRef} style={{
        position: 'fixed', inset: 0, background: '#000', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '20px', fontFamily: 'var(--font-mono, monospace)'
      }}>
        <div ref={wordmarkRef} style={{
          fontSize: '22px', letterSpacing: '0.35em', color: '#c8a84b',
          textTransform: 'uppercase', opacity: 0
        }}>
          AEGIS <span style={{ color: '#5a5c4a' }}>//</span> SWARM
        </div>
        
        <div ref={textRef} style={{
          fontSize: '11px', letterSpacing: '0.12em', color: '#5a5c4a',
          textTransform: 'uppercase', lineHeight: 1.9, width: '360px'
        }}>
          <span className="boot-line" style={{ opacity: 0, display: 'block', color: '#c8c9b8' }}>[ AEGIS SWARM v2.4.1 ]</span>
          <span className="boot-line" style={{ opacity: 0, display: 'block' }}>initializing kernel modules ............ <b style={{ color: '#4caf50' }}>OK</b></span>
          <span className="boot-line" style={{ opacity: 0, display: 'block' }}>loading agent registry ................. <b style={{ color: '#4caf50' }}>OK</b></span>
          <span className="boot-line" style={{ opacity: 0, display: 'block' }}>establishing secure channel ............ <b style={{ color: '#4caf50' }}>OK</b></span>
          <span className="boot-line" style={{ opacity: 0, display: 'block' }}>validating red_team config ............. <b style={{ color: '#4caf50' }}>OK</b></span>
          <span className="boot-line" style={{ opacity: 0, display: 'block' }}>validating blue_team config ............ <b style={{ color: '#4caf50' }}>OK</b></span>
          <span className="boot-line" style={{ opacity: 0, display: 'block' }}>provisioning sandbox environment ....... <b style={{ color: '#e0922a' }}>WARN</b></span>
          <span className="boot-line" style={{ opacity: 0, display: 'block' }}>mounting audit filesystem .............. <b style={{ color: '#4caf50' }}>OK</b></span>
          <span className="boot-line" style={{ opacity: 0, display: 'block' }}>system ready ........................... <b style={{ color: '#4caf50' }}>ONLINE</b></span>
        </div>
      </div>
    </>
  );
}

export default BootSequence;