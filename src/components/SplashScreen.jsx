import './SplashScreen.css';

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-icon">🚀</div>
        <h1>Mi PWA App</h1>
        <p>Conectando con el backend...</p>
        <div className="splash-loader"></div>
        <div className="splash-features">

        </div>
      </div>
    </div>
  );
};

export default SplashScreen;