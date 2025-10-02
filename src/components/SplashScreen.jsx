import './SplashScreen.css';

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img 
          src="/icons/icon256.png" 
          alt="App Icon" 
          className="splash-icon"
        />
        <h1>Mi Primera PWA</h1>
        <div className="splash-loader"></div>
      </div>
    </div>
  );
};

export default SplashScreen;