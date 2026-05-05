import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ensureAuthorForUser } from "../api";
import "./AppShell.css";

const NAV_ITEMS = [
  { icon: "menu_book", label: "Stories", path: "/stories", hint: "Library and drafts" },
] as const;

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [initError, setInitError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const authorId = localStorage.getItem("author_id");
    const isValidUuid = (v: string | null) =>
      !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    if (!userId) {
      setReady(true);
      return;
    }

    if (isValidUuid(authorId)) {
      setReady(true);
      return;
    }

    localStorage.removeItem("author_id");

    void (async () => {
      try {
        const author = await ensureAuthorForUser(userId);
        localStorage.setItem("author_id", author.id);
      } catch (error) {
        setInitError(error instanceof Error ? error.message : "Failed to initialize author profile");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  function handleLogout() {
    localStorage.removeItem("user_id");
    localStorage.removeItem("author_id");
    navigate("/");
  }

  return (
    <div className={`shell ${collapsed ? "shell--collapsed" : ""}`}>
      <aside className={`shell-sidebar ${collapsed ? "shell-sidebar--collapsed" : ""}`}>
        <div className="shell-sidebar__content">
          <button className="shell-brand" onClick={() => navigate("/stories")}>
            <span className="shell-brand__mark">
              <span className="material-symbols-outlined">auto_stories</span>
            </span>
            {!collapsed && (
              <span className="shell-brand__copy">
                <strong>Decide Studio</strong>
                <span>Interactive authoring</span>
              </span>
            )}
          </button>

          {!collapsed && (
            <div className="shell-sidebar__intro glass-panel">
              <p className="shell-sidebar__eyebrow">Narrative Engine</p>
              <h2>Write in panels. Branch in choices. Publish as episodes.</h2>
            </div>
          )}

          <nav className="shell-nav">
            {NAV_ITEMS.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path === "/stories" && location.pathname.startsWith("/stories"));

              return (
                <button
                  key={item.path}
                  className={`shell-nav__item ${active ? "shell-nav__item--active" : ""}`}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  {!collapsed && (
                    <span className="shell-nav__copy">
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="shell-sidebar__actions">
          <button className="shell-utility" onClick={() => setCollapsed((value) => !value)}>
            <span className="material-symbols-outlined">
              {collapsed ? "chevron_right" : "left_panel_close"}
            </span>
            {!collapsed && <span>Collapse</span>}
          </button>
          <button className="shell-utility shell-utility--danger" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div className="shell-main">
        {!collapsed && (
          <header className="shell-topbar">
            <div>
              <p className="shell-topbar__label">Author Workspace</p>
              <h1>{location.pathname.startsWith("/stories/") ? "Story Build" : "Story Library"}</h1>
            </div>
            <div className="shell-topbar__status glass-panel">
              <span className="shell-topbar__pulse" />
              Live connection to author tools
            </div>
          </header>
        )}

        {initError && <div className="app-error shell-banner">{initError}</div>}

        <main className="shell-content">
          {ready ? (
            <Outlet />
          ) : (
            <div className="shell-loading">
              <div className="shell-loading__orb" />
              <p>Loading author workspace…</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
