import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({
  className = "",
  children,
  fallbackPath = "/",
  style = {},
  onMouseEnter,
  onMouseLeave
}) => {
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
      style={style}
      aria-label="Go back"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children || "← Back"}
    </button>
  );
};

export default BackButton;
