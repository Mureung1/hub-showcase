export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-meta-label">
        main / <span className="accent-text">about us</span>
      </div>

      <div className="hero-title-container">
        <img src="/artist_bw.png" alt="Artist B&W" className="floating-img img-left" />
        <img src="/tunnel_green.png" alt="Model Green Tunnel" className="floating-img img-center" />
        <h1 className="hero-title">
          predict
          <br />
          next
        </h1>
      </div>

      <div className="hero-footer">
        <div className="plus-icon">[+]</div>
        <p className="location-text">based in seoul, analyzing global markets</p>
        <div className="vertical-line"></div>
      </div>
    </section>
  );
}
