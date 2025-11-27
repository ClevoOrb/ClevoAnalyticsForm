import Lottie from "lottie-react";
import loadinggif from "../../loadingGif/preloader.json"

const LoadingScreen = ({ message }) => {
  return (
    <div className="fixed inset-0 flex flex-col justify-center items-center z-50 bg-[#120D1F] bg-opacity-70 backdrop-blur-md">
      <Lottie animationData={loadinggif} loop={true} className="mac:w-[15%] w-[30%]" />
      {message && (
        <p className="mt-4 text-white text-center text-lg font-medium px-4">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingScreen;
