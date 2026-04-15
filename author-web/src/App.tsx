import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AppShell from "./components/AppShell";
import StoriesPage from "./pages/StoriesPage";
import EpisodesPage from "./pages/EpisodesPage";
import EpisodeGraphPage from "./pages/EpisodeGraphPage";

function isAuthed() {
  return Boolean(localStorage.getItem("user_id"));
}

function Protected({ children }: { children: React.ReactNode }) {
  return isAuthed() ? <>{children}</> : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/* Authenticated routes with persistent sidebar shell */}
        <Route element={<Protected><AppShell /></Protected>}>
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/stories/:storyId/episodes" element={<EpisodesPage />} />
        </Route>

        {/* Graph editor has its own full-screen layout */}
        <Route
          path="/episodes/:episodeId/graph"
          element={isAuthed() ? <EpisodeGraphPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/episodes/:episodeId/graph/"
          element={isAuthed() ? <EpisodeGraphPage /> : <Navigate to="/" replace />}
        />

        {/* Redirects */}
        <Route path="/dashboard" element={<Navigate to="/stories" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
