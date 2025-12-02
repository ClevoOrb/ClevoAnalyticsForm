import { AiOutlineClose } from "react-icons/ai";
import { BiInfoCircle } from "react-icons/bi";

function ConfirmationModal({ modalopen, fun }) {
  return (
    <>
      {modalopen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#F2F4F7] rounded-[30px] shadow-2xl p-8 w-full max-w-lg relative">
            <button
              onClick={() => fun("no")}
              className="absolute top-6 right-6 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <AiOutlineClose className="w-5 h-5 text-gray-600" />
            </button>

            <div className="text-center mb-8">
              <div className="mb-6 p-4 bg-white rounded-full w-fit mx-auto">
                <BiInfoCircle className="w-8 h-8 text-[var(--color-accent)]" />
              </div>
              <h2 className="text-[1.5rem] leading-[2rem] font-bold text-[#2C2C2C] mb-4">
                Confirm Submission
              </h2>
              <p className="text-[#646464] text-[1rem] leading-[1.5rem] tab:text-[1.1rem] tab:leading-[1.6rem] mac:text-[1.1rem] mac:leading-[1.6rem]">
                Are you sure you want to submit? You cannot edit your response after submission.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                onClick={() => fun("no")}
                className="w-full sm:w-auto px-8 py-3 text-[15px] font-bold uppercase border-2 border-[var(--color-dark)] text-[var(--color-dark)] rounded-full hover:bg-[var(--color-dark)] hover:text-white transition-all duration-200 opensans-bold bg-white"
              >
                Go Back
              </button>
              <button
                onClick={() => fun("yes")}
                className="w-full sm:w-auto px-10 py-3 text-[15px] font-bold uppercase bg-[var(--color-dark)] text-white rounded-full hover:bg--[var(--color-accent)] border-2 border-[var(--color-dark)] hover:border--[var(--color-dark)] transition-all duration-200 opensans-bold"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ConfirmationModal;
