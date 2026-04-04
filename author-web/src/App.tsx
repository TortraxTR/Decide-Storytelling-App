import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import StoriesPage from "./pages/StoriesPage";
import EpisodesPage from "./pages/EpisodesPage";
import NodesPage from "./pages/NodesPage";
import DecisionsPage from "./pages/DecisionsPage";
import PickStoryPage from "./pages/PickStoryPage";
import PickEpisodePage from "./pages/PickEpisodePage";
import EpisodeGraphPage from "./pages/EpisodeGraphPage";

function isAuthed() {
  // Only require user_id for initial navigation. author_id can be created lazily.
  return Boolean(localStorage.getItem("user_id"));
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={isAuthed() ? <DashboardPage /> : <Navigate to="/" replace />} />
        <Route path="/stories" element={isAuthed() ? <StoriesPage /> : <Navigate to="/" replace />} />
        <Route path="/stories/:storyId/episodes" element={isAuthed() ? <EpisodesPage /> : <Navigate to="/" replace />} />
        <Route path="/episodes/:episodeId/nodes" element={isAuthed() ? <NodesPage /> : <Navigate to="/" replace />} />
        <Route path="/episodes/:episodeId/decisions" element={isAuthed() ? <DecisionsPage /> : <Navigate to="/" replace />} />
        <Route path="/episodes/:episodeId/graph" element={isAuthed() ? <EpisodeGraphPage /> : <Navigate to="/" replace />} />
        <Route path="/pick-story/:flow" element={isAuthed() ? <PickStoryPage /> : <Navigate to="/" replace />} />
        <Route path="/pick-episode/:storyId/:flow" element={isAuthed() ? <PickEpisodePage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
