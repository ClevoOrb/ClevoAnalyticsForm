import React from 'react';
import Modal from 'react-modal';

const Points = "/assets/point.svg";
const Streaks = "/assets/streak.svg";
const Badge = "/assets/sectionBadge.svg";

const BadgeEarnedModal = ({ isOpen, onClose, sectionName, sectionCoins, sectionStreaks }) => {
  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      borderRadius: '20px',
      padding: '0',
      border: 'none',
      background: 'linear-gradient(135deg, #080594 0%, #0ea5e9 50%, #10b981 100%)',
      width: '90%',
      maxWidth: '400px',
      overflow: 'visible'
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: 1000
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel="Badge Earned Modal"
      ariaHideApp={false}
    >
      <div className="p-8 text-center text-white">
        <div className="mb-6 relative">
          <div className="text-8xl ">
            <img src={Badge} alt="Badge Icon" className="w-24 h-24 mx-auto" />
          </div>
          <div className="absolute -top-2 -right-2 text-3xl animate-pulse">✨</div>
          <div className="absolute -top-2 -left-2 text-3xl animate-pulse delay-75">✨</div>
          <div className="absolute -bottom-2 -right-4 text-3xl animate-pulse delay-150">✨</div>
        </div>

        <h2 className="text-3xl font-bold mb-2 arca text-white">SECTION COMPLETED!</h2>
        <p className="text-xl mb-2 opensans-regular">
          {sectionName.charAt(0) + sectionName.slice(1).toLowerCase()} Assessment
        </p>
        <p className="text-sm mb-6 opacity-90 opensans-regular">
          Great progress on your health journey! 🩺
        </p>

        <button
          onClick={onClose}
          className="bg-white text-[var(--color-dark)] px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 opensans-bold border-2 border-[var(--color-dark)]/20"
        >
          Continue Health Assessment
        </button>
      </div>
    </Modal>
  );
};

export default BadgeEarnedModal;
