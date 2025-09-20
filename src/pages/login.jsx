// src/pages/LoginForm.jsx
import React from 'react';
import './register.css';
import ParticlesComponent from '../components/particles';

export default function LoginForm() {
  const handleGithubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      console.error('VITE_GITHUB_CLIENT_ID not defined');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'gist',
      redirect_uri: redirectUri
    });

    const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    // quick debug log so you can see exactly what is opened
    console.log('Opening GitHub OAuth URL:', url);
    window.location.href = url;
  };

  return (
    <div className="app-wrapper">
      <ParticlesComponent id="particles" />

      <div className="form-wrapper">
        <div className="border border-2 rounded p-4 mx-auto">
          <h1 style={{ color: 'white' }}>Log In</h1>

          <button type="button" onClick={handleGithubLogin} className="btn btn-dark w-100 mt-3">
            Log in with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
