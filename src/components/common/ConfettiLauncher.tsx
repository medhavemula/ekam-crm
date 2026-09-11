import React, { useState } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

interface ConfettiLauncherProps {
  buttonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  buttonSize?: 'sm' | 'md' | 'lg';
  confettiPieces?: number;
  confettiDuration?: number;
}

const ConfettiLauncher: React.FC<ConfettiLauncherProps> = ({
  buttonPosition = 'top-right',
  buttonSize = 'md',
  confettiPieces = 500,
  confettiDuration = 5000,
}) => {
  const { width } = useWindowSize();
  const [height, setHeight] = useState(0);
  
  // Update height when component mounts and window resizes
  React.useEffect(() => {
    const updateHeight = () => {
      setHeight(Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.documentElement.clientHeight
      ));
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const handleClick = () => {
    // Force re-render the Confetti component by changing the key
    setConfettiKey(prev => prev + 1);
    setShowConfetti(true);
    
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, confettiDuration);
    
    return () => clearTimeout(timer);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`fixed ${positionClasses[buttonPosition]} ${sizeClasses[buttonSize]} flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all duration-300 z-50 opacity-0 hover:opacity-100`}
        aria-label="Launch Confetti"
        title="Celebrate! 🎉"
      >
        🎉
      </button>
      
      {showConfetti && (
        <Confetti
          key={confettiKey}
          width={width}
          height={height}
          recycle={false}
          run={showConfetti}
          numberOfPieces={confettiPieces}
          gravity={0.3}
          tweenDuration={7000}
          initialVelocityY={25}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}
        />
      )}
    </>
  );
};

export default ConfettiLauncher;