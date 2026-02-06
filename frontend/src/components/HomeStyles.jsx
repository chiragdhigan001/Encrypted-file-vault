import './../pages/home.css';

const HomeStyles = () => {
  return (
    <div className="body">
      <div className="body-bg"></div>
      <div className="grid-overlay"></div>
      <div className="orbit orbit-blue"></div>
      <div className="orbit orbit-purple"></div>
      <div className="body-container">
        <div className="body-content">
          <span></span>
          <p></p>
        </div>
        <h1 className="title">
          <span className="gradient-text"></span>
        </h1>
        <p className="description"></p>
        <div className="actions">
          <button className="get-started"></button>
        </div>
      </div>
    </div>
  );
};

export default HomeStyles;
