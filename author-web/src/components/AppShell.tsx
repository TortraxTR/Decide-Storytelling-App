import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ensureAuthorForUser } from "../api";
import "./AppShell.css";

const NAV_ITEMS = [
    { icon: "home", label: "Home", path: "/stories" },
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

        if (!userId) { setReady(true); return; }
        if (isValidUuid(authorId)) { setReady(true); return; }

        localStorage.removeItem("author_id");
        (async () => {
            try {
                const res = await ensureAuthorForUser(userId);
                localStorage.setItem("author_id", res.id);
            } catch (e) {
                setInitError(e instanceof Error ? e.message : "Failed to initialize author profile");
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
        <div className="shell">
            <aside className={`shell-sidebar ${collapsed ? "shell-sidebar--collapsed" : ""}`}>
                <div className="shell-sidebar__top">
                    <button
                        className="shell-brand"
                        onClick={() => navigate("/stories")}
                    >
                        <span className="shell-brand__icon">
                            <span className="material-symbols-outlined">auto_stories</span>
                        </span>
                        {!collapsed && <span className="shell-brand__text">Decide</span>}
                    </button>

                    <nav className="shell-nav">
                        {NAV_ITEMS.map((item) => {
                            const active = location.pathname === item.path ||
                                (item.path === "/stories" && location.pathname.startsWith("/stories"));
                            return (
                                <button
                                    key={item.path}
                                    className={`shell-nav__item ${active ? "shell-nav__item--active" : ""}`}
                                    onClick={() => navigate(item.path)}
                                    title={item.label}
                                >
                                    <span className="material-symbols-outlined">{item.icon}</span>
                                    {!collapsed && <span>{item.label}</span>}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="shell-sidebar__bottom">
                    <button
                        className="shell-nav__item"
                        onClick={() => setCollapsed((c) => !c)}
                        title={collapsed ? "Expand" : "Collapse"}
                    >
                        <span className="material-symbols-outlined">
                            {collapsed ? "chevron_right" : "chevron_left"}
                        </span>
                        {!collapsed && <span>Collapse</span>}
                    </button>
                    <button className="shell-nav__item shell-nav__item--danger" onClick={handleLogout} title="Sign Out">
                        <span className="material-symbols-outlined">logout</span>
                        {!collapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            <div className="shell-content">
                {initError && (
                    <div className="shell-error">{initError}</div>
                )}
                {ready ? <Outlet /> : (
                    <div className="shell-loading">
                        <span className="material-symbols-outlined shell-loading__icon">auto_stories</span>
                        <p>Loading…</p>
                    </div>
                )}
            </div>
        </div>
    );
}
