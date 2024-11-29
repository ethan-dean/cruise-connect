import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CountdownPopup.css'

interface CountdownPopupProps {
  displayText: string;
  countdownTimeSeconds: number; // in seconds
  navigateDestination: string;
}

export default function CountdownPopup(props: CountdownPopupProps) {
  const [timeLeft, setTimeLeft] = useState(props.countdownTimeSeconds);
  const navigate = useNavigate();

  useEffect(() => {
    if (timeLeft <= 0) {
      navigate(props.navigateDestination);
      return;
    }

    const timerId = setTimeout(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    // Clean up the timer on component unmount
    return () => clearTimeout(timerId);
  }, [timeLeft, navigate, props.navigateDestination]);

  return (
    <div className='popup-overlay'>
      <div className='popup'>
        <p>{props.displayText}</p>
        <p>Redirecting in {timeLeft} seconds...</p>
      </div>
    </div>
  );
};
