// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import LogIn from './pages/login';
import Main from './pages/main';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

const basename = import.meta.env.PROD ? '/Habit' : '/';

function App() {
  return (
    // The basename prop ensures React Router handles the subdirectory correctly
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<LogIn />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Main />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;