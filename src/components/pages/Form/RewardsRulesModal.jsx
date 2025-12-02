import clevoInfo from '../../assets/rewardInfo.svg';

const RewardsRulesModal = ({ isOpen, onClose, isFirstTime = false, themeId = "default" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 m-4 max-w-lg w-full max-h-[90vh] overflow-y-auto relative flex flex-col items-center">
        <div className="flex flex-col items-center mb-4">
          {/* Only show clevoInfo image when using default theme */}
          {themeId === "default" && (
            <img src={clevoInfo} alt="Rewards Icon" className="w-[80%]" />
          )}
          <h2 className="text-lg mac:text-2xl font-bold text-[var(--color-accent)] arca mt-10">
            {isFirstTime ? "GAME ON CLEVONIANS!" : "GAME ON CLEVONIANS!"}
          </h2>
          <div className='text-center font-sans font-semibold text-[#2C2C2C] text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem]'>
            <p className='my-4'><span className='uppercase text-[var(--color-dark)] font-bold '>+100 CLEVO COINS</span> for every question answered!</p>
            <p className='my-4'>Build Streaks for every question! <br/>
              Every <span className='uppercase text-[var(--color-dark)] font-bold '>5</span> streaks = earn +200 CLEVO COINS<br/>
              <span className=' text-[var(--color-dark)] font-bold '>Streak breaks</span>  if you take a break </p>

            <p>Complete a section to
              <span className=' text-[var(--color-dark)] font-bold '> Earn a badge</span></p>

          </div>

        </div>

        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-[3rem] leading-none absolute top-4 right-4"
        >
          &times;
        </button>

        <button
          onClick={onClose}
          className="mt-6 w-[50%] bg-[var(--color-dark)] text-white py-3 rounded-full font-bold hover:bg--[var(--color-dark)] transition-colors"
        >
          {isFirstTime ? "Let's Start!" : "Got it!"}
        </button>
      </div>
    </div>
  );
};

export default RewardsRulesModal;
