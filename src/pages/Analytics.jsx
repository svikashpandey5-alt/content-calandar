import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  FileText,
  Users,
  Eye,
  Heart,
  MessageSquare
} from "lucide-react";

// Custom SVG components for brand icons that are missing in newer Lucide versions
const Instagram = (props) => (
  <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Facebook = (props) => (
  <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Youtube = (props) => (
  <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics({ assets, calendarDays }) {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Filter assets that have any analytics data
  const publishedAssets = assets.filter(
    a => a.analytics && (a.analytics.IG || a.analytics.FB || a.analytics.YT)
  );

  // Calculate aggregates
  let totalIgLikes = 0;
  let totalIgReach = 0;
  let totalFbLikes = 0;
  let totalFbReach = 0;
  let totalYtViews = 0;
  let totalYtLikes = 0;

  publishedAssets.forEach(a => {
    if (a.analytics.IG) {
      totalIgLikes += a.analytics.IG.likes || 0;
      totalIgReach += a.analytics.IG.reach || 0;
    }
    if (a.analytics.FB) {
      totalFbLikes += a.analytics.FB.likes || 0;
      totalFbReach += a.analytics.FB.reach || 0;
    }
    if (a.analytics.YT) {
      totalYtViews += a.analytics.YT.views || 0;
      totalYtLikes += a.analytics.YT.likes || 0;
    }
  });

  // Prepare chart data: aggregate daily reach / views
  // Group published assets by date and aggregate reach
  const dailyReach = {};
  publishedAssets.forEach(a => {
    const dates = [];
    if (a.analytics.IG?.postedAt) dates.push(a.analytics.IG.postedAt.split("T")[0]);
    if (a.analytics.FB?.postedAt) dates.push(a.analytics.FB.postedAt.split("T")[0]);
    
    dates.forEach(d => {
      const reach = (a.analytics.IG?.reach || 0) + (a.analytics.FB?.reach || 0);
      dailyReach[d] = (dailyReach[d] || 0) + reach;
    });
  });

  const sortedDates = Object.keys(dailyReach).sort();
  const reachValues = sortedDates.map(d => dailyReach[d]);

  const lineChartData = {
    labels: sortedDates.length > 0 ? sortedDates : ["No Data"],
    datasets: [
      {
        fill: true,
        label: "Meta Platforms Daily Reach (IG + FB)",
        data: reachValues.length > 0 ? reachValues : [0],
        borderColor: "#e5a94e",
        backgroundColor: "rgba(229, 169, 78, 0.1)",
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: false }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  // Generate Weekly Summary Report
  const handleGenerateWeeklyReport = () => {
    // Get calendar rows in the last 7 calendar days
    // For testing/mocking, we can take the first 7 days from the calendar Days
    const last7Days = calendarDays.slice(0, 7);
    
    let fbPosted = 0, igPosted = 0, ytPosted = 0;
    let liPosted = 0, scPosted = 0, waPosted = 0;
    
    const reportRows = last7Days.map(day => {
      const rowMetrics = { date: day.date, day: day.day, platforms: {} };
      
      const platforms = ["IG", "FB", "LinkedIn", "Snapchat", "YT", "WhatsApp"];
      platforms.forEach(p => {
        const assetId = day[p];
        if (assetId && assetId !== "ALL CONTENT USED") {
          const asset = assets.find(a => a.assetId === assetId);
          const isPosted = asset?.postedOn?.[p];
          
          if (isPosted) {
            if (p === "IG") igPosted++;
            if (p === "FB") fbPosted++;
            if (p === "YT") ytPosted++;
            if (p === "LinkedIn") liPosted++;
            if (p === "Snapchat") scPosted++;
            if (p === "WhatsApp") waPosted++;
            
            rowMetrics.platforms[p] = {
              status: "Posted",
              likes: asset.analytics?.[p]?.likes || 0,
              reach: asset.analytics?.[p]?.reach || asset.analytics?.[p]?.views || 0
            };
          } else {
            rowMetrics.platforms[p] = {
              status: p === "IG" || p === "FB" || p === "YT" ? "Failed / Pending Auto" : "Manual Entry Pending",
              likes: 0,
              reach: 0
            };
          }
        } else {
          rowMetrics.platforms[p] = { status: "Empty / All Used", likes: 0, reach: 0 };
        }
      });
      return rowMetrics;
    });

    setReportData({
      days: reportRows,
      summary: {
        metaPosted: fbPosted + igPosted,
        ytPosted,
        manualPending: (last7Days.length * 3) - (liPosted + scPosted + waPosted),
        manualPosted: liPosted + scPosted + waPosted
      }
    });
    setReportModalOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontFamily: "var(--font-title)" }}>Performance & Analytics</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Monitor real-time insights from auto-posting (IG/FB/YT) and generate compiled campaign summaries.
          </p>
        </div>
        <button
          onClick={handleGenerateWeeklyReport}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <FileText size={16} />
          <span>Weekly Campaign Report</span>
        </button>
      </div>

      {/* Aggregate Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
        {/* Instagram Stats */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#E1306C" }}>
            <Instagram size={24} />
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Instagram</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totalIgReach.toLocaleString()}</div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Impressions Reach</span>
          <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "0.5rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <span>Likes: <strong>{totalIgLikes}</strong></span>
          </div>
        </div>

        {/* Facebook Stats */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#1877F2" }}>
            <Facebook size={24} />
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Facebook</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totalFbReach.toLocaleString()}</div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Content Reach</span>
          <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "0.5rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <span>Likes: <strong>{totalFbLikes}</strong></span>
          </div>
        </div>

        {/* YouTube Stats */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#FF0000" }}>
            <Youtube size={24} />
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>YouTube</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totalYtViews.toLocaleString()}</div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Video Views</span>
          <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "0.5rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <span>Likes: <strong>{totalYtLikes}</strong></span>
          </div>
        </div>
      </div>

      {/* Analytics Trend Chart */}
      <div className="card" style={{ height: "350px", display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Meta Reach Progression</h3>
        <div style={{ flex: 1, position: "relative" }}>
          <Line data={lineChartData} options={chartOptions} />
        </div>
      </div>

      {/* Asset Performance Table */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Post-level Analytics</h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: "90px" }}>Asset ID</th>
                <th>Asset Title / Name</th>
                <th style={{ width: "120px" }}>IG Reach</th>
                <th style={{ width: "120px" }}>FB Reach</th>
                <th style={{ width: "120px" }}>YT Views</th>
                <th style={{ width: "120px" }}>Total Likes</th>
              </tr>
            </thead>
            <tbody>
              {publishedAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                    No published metrics found. Mocks will be generated when you click "Simulate Publish" on the Dashboard.
                  </td>
                </tr>
              ) : (
                publishedAssets.map(asset => {
                  const igLikes = asset.analytics?.IG?.likes || 0;
                  const fbLikes = asset.analytics?.FB?.likes || 0;
                  const ytLikes = asset.analytics?.YT?.likes || 0;
                  
                  return (
                    <tr key={asset.assetId}>
                      <td style={{ fontWeight: 600 }}>{asset.assetId}</td>
                      <td style={{ fontWeight: 500 }}>{asset.name}</td>
                      <td>{asset.analytics?.IG?.reach?.toLocaleString() || "-"}</td>
                      <td>{asset.analytics?.FB?.reach?.toLocaleString() || "-"}</td>
                      <td>{asset.analytics?.YT?.views?.toLocaleString() || "-"}</td>
                      <td style={{ fontWeight: 600 }}>{(igLikes + fbLikes + ytLikes).toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Report Modal */}
      {reportModalOpen && reportData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div className="card" style={{ width: "95%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-title)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={22} style={{ color: "var(--accent)" }} /> Weekly Campaign Summary
              </h3>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.25rem 0.5rem" }}
                onClick={() => setReportModalOpen(false)}
              >
                Close
              </button>
            </div>

            {/* Quick Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Meta Auto-Published</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{reportData.summary.metaPosted} posts</div>
              </div>
              <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>YT Videos Posted</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{reportData.summary.ytPosted} videos</div>
              </div>
              <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Manual Post Tracker</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                  {reportData.summary.manualPosted} done / {reportData.summary.manualPending} pending
                </div>
              </div>
            </div>

            {/* Detailed Row Listings */}
            <div style={{ border: "1px solid var(--border-color)", borderRadius: "6px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9" }}>
                    <th style={{ padding: "0.5rem", borderBottom: "1px solid #cbd5e1" }}>Date</th>
                    <th style={{ padding: "0.5rem", borderBottom: "1px solid #cbd5e1" }}>IG</th>
                    <th style={{ padding: "0.5rem", borderBottom: "1px solid #cbd5e1" }}>FB</th>
                    <th style={{ padding: "0.5rem", borderBottom: "1px solid #cbd5e1" }}>LinkedIn</th>
                    <th style={{ padding: "0.5rem", borderBottom: "1px solid #cbd5e1" }}>Snapchat</th>
                    <th style={{ padding: "0.5rem", borderBottom: "1px solid #cbd5e1" }}>YouTube</th>
                    <th style={{ padding: "0.5rem", borderBottom: "1px solid #cbd5e1" }}>WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.days.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.5rem", fontWeight: 600 }}>{row.date}</td>
                      {["IG", "FB", "LinkedIn", "Snapchat", "YT", "WhatsApp"].map(p => {
                        const cell = row.platforms[p];
                        
                        let textStyle = {};
                        if (cell.status === "Posted") {
                          textStyle = { color: "#166534", fontWeight: 500 };
                        } else if (cell.status.includes("Pending")) {
                          textStyle = { color: "#854d0e", fontStyle: "italic" };
                        } else {
                          textStyle = { color: "var(--text-muted)", fontSize: "0.75rem" };
                        }

                        return (
                          <td key={p} style={{ padding: "0.5rem" }}>
                            <div style={textStyle}>{cell.status}</div>
                            {cell.status === "Posted" && (
                              <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                                R: {cell.reach} | L: {cell.likes}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.print()}
              >
                <Download size={14} /> Print Report
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setReportModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
