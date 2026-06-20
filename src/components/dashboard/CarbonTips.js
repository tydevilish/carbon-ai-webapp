"use client";

export default function CarbonTips({ tips = [] }) {
  return (
    <div className="widget-card">
      <div className="widget-header">
        <h3 className="widget-title">Tips for Reducing Carbon Footprint</h3>
      </div>
      <div className="tips-list">
        {tips.slice(0, 4).map((tip, i) => (
          <div key={i} className="tip-item">
            <span className="tip-number">{i + 1}</span>
            <span className="tip-text">{tip}</span>
          </div>
        ))}
      </div>
      <button className="tips-more-btn">More Tips →</button>
    </div>
  );
}
