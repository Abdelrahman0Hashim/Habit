// src/services/gistService.js
const BASE_URL = "https://api.github.com/gists";

// Initial files for a brand-new Gist (store arrays for simplicity)
const INITIAL_FILES = {
  "todaysTasks.json": "[]",
  "scheduledTasks.json": "[]"
};

// Files to ensure exist (with starter content)
const REQUIRED_FILES = {
  "todaysTasks.json": JSON.stringify([], null, 2),
  "scheduledTasks.json": JSON.stringify([], null, 2)
};

function getToken() {
  const token = localStorage.getItem("GITHUB_TOKEN");
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN. Paste a PAT with gist scope.");
  }
  return token;
}

async function createGist(token) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${token}`
    },
    body: JSON.stringify({
      description: "User's Task Tracker Gist",
      public: false,
      files: Object.fromEntries(
        Object.entries(INITIAL_FILES).map(([name, content]) => [name, { content }])
      )
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gist creation failed (${res.status}): ${err.message || res.statusText}`);
  }

  const { id } = await res.json();
  if (!id) throw new Error("Gist created but no ID returned");
  localStorage.setItem("GIST_ID", id);
  return id;
}

async function fetchGist(gistId, token) {
  const res = await fetch(`${BASE_URL}/${gistId}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json"
    }
  });

  if (res.status === 404) {
    throw new Error("GIST_NOT_FOUND");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch Gist (${res.status}): ${err.message || res.statusText}`);
  }

  return res.json();
}

export async function ensureGistExists() {
  const token = getToken();
  let gistId = localStorage.getItem("GIST_ID");

  if (gistId) {
    try {
      await fetchGist(gistId, token);
      return gistId;
    } catch (err) {
      if (err.message === "GIST_NOT_FOUND") {
        console.warn("Stored GIST_ID not found — creating a new Gist");
        localStorage.removeItem("GIST_ID");
      } else {
        throw err;
      }
    }
  }

  return await createGist(token);
}

export async function ensureRequiredFiles() {
  const token = getToken();
  const gistId = await ensureGistExists();
  const gist = await fetchGist(gistId, token);
  const existing = Object.keys(gist.files || {});
  const missing = Object.keys(REQUIRED_FILES).filter(name => !existing.includes(name));

  if (missing.length === 0) return;

  const payload = Object.fromEntries(
    missing.map(name => [name, { content: REQUIRED_FILES[name] }])
  );

  const res = await fetch(`${BASE_URL}/${gistId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${token}`
    },
    body: JSON.stringify({ files: payload })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to patch Gist (${res.status}): ${err.message || res.statusText}`);
  }
}

// Fetch and parse one JSON “file” from the Gist (returns parsed JSON)
async function fetchFile(fileName) {
  const token = getToken();
  const gistId = await ensureGistExists();

  const res = await fetch(`${BASE_URL}/${gistId}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json"
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch ${fileName} (${res.status}): ${body.message || res.statusText}`);
  }

  const body = await res.json();
  const content = body.files?.[fileName]?.content ?? "[]";
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse ${fileName} content as JSON: ${err.message}`);
  }
}

// Overwrite one JSON “file” in the Gist and return data
async function updateFile(fileName, data) {
  const token = getToken();
  const gistId = localStorage.getItem("GIST_ID");
  if (!gistId) throw new Error("Missing GIST_ID in localStorage");

  console.log(`(gistService) PATCH ${fileName}:`, data);

  const payload = {
    files: {
      [fileName]: {
        content: JSON.stringify(data, null, 2)
      }
    }
  };

  const res = await fetch(`${BASE_URL}/${gistId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${token}`
    },
    body: JSON.stringify(payload)
  });

  let body;
  try {
    body = await res.json();
  } catch (e) {
    body = {};
    console.log(e);
  }

  console.log(`[gistService] PATCH response`, res.status, body);

  if (!res.ok) {
    throw new Error(`Failed to update ${fileName} (${res.status}): ${body.message || res.statusText}`);
  }

  return data;
}

// Public API (consistent names and corrected typo)
export async function loadTodayTasks() {
  return fetchFile("todaysTasks.json");
}

export async function updateTodayTasks(tasks) {
  return updateFile("todaysTasks.json", tasks);
}

export async function loadScheduledTasks() {
  return fetchFile("scheduledTasks.json");
}

export async function updateScheduledTasks(tasks) {
  return updateFile("scheduledTasks.json", tasks);
}

export async function createTodayTask(task) {
  const current = await loadTodayTasks();
  if (!Array.isArray(current)) throw new Error("todaysTasks.json content must be an array");
  return updateTodayTasks([...current, task]);
}

export async function createScheduledTask(task) {
  const current = await loadScheduledTasks();
  if (!Array.isArray(current)) throw new Error("scheduledTasks.json content must be an array");
  return updateScheduledTasks([...current, task]);
}

export async function ensureGistEmpty() {
  const token = getToken();

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${token}`
    },
    body: JSON.stringify({
      description: "User's Task Tracker Gist",
      public: false,
      files: {
        "todaysTasks.json": { content: "[]" },
        "scheduledTasks.json": { content: "[]" }
      }
    })
  });

  const body = await res.json().catch(() => ({}));
  console.log("[gistService] createGist response", res.status, body);

  if (!res.ok) {
    throw new Error(`Gist creation failed (${res.status}): ${body.message || res.statusText}`);
  }

  const gistId = body.id;
  if (!gistId) throw new Error("Gist created but no ID was returned");

  localStorage.setItem("GIST_ID", gistId);
  console.log("[gistService] GIST_ID stored:", gistId);

  return gistId;
}

window.gistService = {
  ensureGistEmpty,
  ensureGistExists,
  ensureRequiredFiles,
  loadTodayTasks,
  loadScheduledTasks,
  createTodayTask,
  createScheduledTask,
  updateTodayTasks,
  updateScheduledTasks
};
