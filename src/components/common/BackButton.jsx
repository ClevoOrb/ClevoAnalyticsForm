import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ className = "", children, fallbackPath = "/" }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`back-button ${className}`}
      aria-label="Go back"
    >
      {children || "← Back"}
    </button>
  );
};

export default BackButton;
