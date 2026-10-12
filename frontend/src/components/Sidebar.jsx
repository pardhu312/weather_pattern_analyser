import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const username = sessionStorage.getItem("weather_username") || "User";
  const role = sessionStorage.getItem("weather_role") || "USER";

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const navItems = [
    {
      section: "MONITOR",
      items: [
        { path: "/dashboard", label: "Dashboard", icon: "◇" },
        { path: "/weather", label: "Weather", icon: "◉" },
        { path: "/predictions", label: "Predictions", icon: "↗" },
        { path: "/anomalies", label: "Anomalies", icon: "!" },
        { path: "/clusters", label: "City Clusters", icon: "◌" }
      ]
    },
    {
      section: "INTELLIGENCE",
      items: [
        { path: "/analytics", label: "Analytics", icon: "◈" },
        { path: "/models", label: "ML Models", icon: "✦" }
      ]
    }
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-top">
        <div
          className="sidebar-brand"
          onClick={() => navigate("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <div className="brand-logo">W</div>
          <div>
            <h2>Weather</h2>
            <span>Pattern Analyzer</span>
          </div>
        </div>

        {navItems.map((group) => (
          <div key={group.section} className="sidebar-group">
            <div className="sidebar-section-title">{group.section}</div>
            <nav className="sidebar-nav">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    className={`nav-item ${isActive ? "active" : ""}`}
                    onClick={() => navigate(item.path)}
                    type="button"
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-details">
            <strong>{username}</strong>
            <span>{role}</span>
          </div>
        </div>

        <button
          className="sidebar-logout"
          onClick={handleLogout}
          type="button"
          title="Sign out"
        >
          <span className="logout-icon">↪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
