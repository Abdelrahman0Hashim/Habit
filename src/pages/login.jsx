import React, { useState } from 'react';
import { Navigate } from 'react-router';
import ParticlesComponent from '../components/particles';
import './register.css';

export default function LoginForm() {
  const [githubToken, setGithubToken] = useState('');
  const [shouldNavigate, setShouldNavigate] = useState(false);

  const handleSubmit = () => {
    if (!githubToken.trim()) {
      alert('Please provide your GitHub Token.');
      return;
    }
    localStorage.setItem('GITHUB_TOKEN', githubToken);
    localStorage.setItem('isAuthorized', 'true');
    setShouldNavigate(true);
  };

  if (shouldNavigate) return <Navigate to="/" replace />;

  return (
    <div className="app-wrapper">
      <ParticlesComponent id="particles" />
      <main className="form-wrapper">
        <section className="card bg-dark text-light p-4 mx-auto shadow" style={{ maxWidth: '480px' }}>
          <header className="mb-3 text-center">
            <h1 className="fw-bold">Welcome</h1>
            <p className="mt-2">
              To get started, please provide a GitHub Personal Access Token (PAT).
              Your data will be stored securely in a Gist.
            </p>
          </header>

          <section>
            <h5 className="fw-semibold">Step 1: Create a GitHub Token</h5>
            <p>
              You need a PAT with <span className="badge bg-secondary">gist</span> scope. It acts like a password for your app.
            </p>
            <ol className="ps-3">
              <li>Go to GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic).</li>
              <li>Click <span className="text-info">Generate new token</span>.</li>
              <li>Name it (e.g., <em>Habit App Token</em>).</li>
              <li>Set expiration to <span className="text-warning">No expiration</span>.</li>
              <li>Enable the <span className="badge bg-secondary">gist</span> scope.</li>
              <li>Click <span className="text-success">Generate token</span> and copy it immediately.</li>
            </ol>
          </section>

          <section className="mt-4">
            <h5 className="fw-semibold">Enter Your Token</h5>
            <div className="form-group mt-3">
              <label htmlFor="github-token" className="form-label">GitHub Token</label>
              <input
                type="password"
                id="github-token"
                className="form-control"
                placeholder="Paste your token here"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary w-100 mt-4"
              onClick={handleSubmit}
            >
              Save and Continue
            </button>
          </section>
        </section>
      </main>
    </div>
  );
}
