import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SecureLogin } from './components/SecureLogin';
import { WorklistDashboard } from './components/WorklistDashboard';
import { InteractiveViewer } from './components/InteractiveViewer';
import { StudyArchive } from './components/StudyArchive';
import { StructuredReporting } from './components/StructuredReporting';
import { SettingsAboutUs } from './components/SettingsAboutUs';
import { HelpGuide } from './components/HelpGuide';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SecureLogin />} />
        <Route path="/dashboard" element={<WorklistDashboard />} />
        <Route path="/viewer" element={<InteractiveViewer />} />
        <Route path="/archive" element={<StudyArchive />} />
        <Route path="/reports" element={<StructuredReporting />} />
        <Route path="/settings" element={<SettingsAboutUs />} />
        <Route path="/help" element={<HelpGuide />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

