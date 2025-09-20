
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';

import LogIn         from './pages/login';
import Main          from './pages/main';
import PrivateRoute  from './components/PrivateRoute';
import './App.css';

function App() {
  
  
  return (
    <BrowserRouter>
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

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
