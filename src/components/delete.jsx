// src/components/DeleteTaskModal.jsx
import React, { useState, useEffect } from 'react';
import {
  loadTodayTasks,
  updateTodayTasks,
  loadScheduledTasks,
  updateScheduledTasks
} from '../services/gistService';

// --- Inline helpers (moved here to avoid extra file) ---

// Extract id and cleaned title (assumes ID is exactly three digits at end, preceded by optional space)
function splitIdFromTitle(rawTitle) {
  if (!rawTitle) return { id: null, title: '' };
  const m = rawTitle.match(/\s*(\d{3})$/);
  if (!m) return { id: null, title: rawTitle.trim() };
  const id = m[1];
  const title = rawTitle.replace(/\s*\d{3}$/, '').trim();
  return { id, title };
}

function sameTask(a, b) {
  return (
    String(a.title) === String(b.title) &&
    String(a.date) === String(b.date) &&
    (a.group || null) === (b.group || null)
  );
}

async function handleDeleteTask(task, choice) {
  if (!task || !task.title) return { ok: false, error: 'Invalid task' };

  const { id, title: baseTitle } = splitIdFromTitle(task.title);
  const isOneOff = id === '000' || id == null;

  if (!choice) {
    if (isOneOff) {
      return {
        ok: true,
        availableChoices: [{ key: 'delete-this', label: 'Delete Today' }]
      };
    }
    return {
      ok: true,
      availableChoices: [
        { key: 'delete-this', label: 'Delete This' },
        { key: 'delete-scheduling', label: 'Remove Schedule' },
        { key: 'delete-all', label: 'Delete All' }
      ]
    };
  }

  try {
    const todays = (await loadTodayTasks()) || [];
    const scheduled = (await loadScheduledTasks()) || [];

    const removeTodayExact = arr => arr.filter(t => !sameTask(t, task));

    const removeTodayByTitle = arr =>
      arr.filter(t => {
        const { title: tBase } = splitIdFromTitle(t.title);
        return tBase !== baseTitle || String(t.group || null) !== String(task.group || null);
      });

    const removeScheduledById = (arr, searchId) =>
      arr.filter(s => String(s.id) !== String(Number(searchId)));

    const removeTodayByTitleAndDate = arr =>
      arr.filter(t => {
        const { title: tBase } = splitIdFromTitle(t.title);
        return !(tBase === baseTitle && t.date === task.date && (t.group || null) === (task.group || null));
      });

    if (isOneOff) {
      const newTodays = removeTodayExact(todays);
      await updateTodayTasks(newTodays);
      return { ok: true };
    }

    switch (choice) {
      case 'delete-all': {
        const newTodays = removeTodayByTitle(todays);
        const newScheduled = removeScheduledById(scheduled, id);
        await updateTodayTasks(newTodays);
        await updateScheduledTasks(newScheduled);
        return { ok: true };
      }

      case 'delete-scheduling': {
        const newScheduled = removeScheduledById(scheduled, id);
        const newTodays = removeTodayByTitleAndDate(todays);
        await updateScheduledTasks(newScheduled);
        await updateTodayTasks(newTodays);
        return { ok: true };
      }

      case 'delete-this': {
        const newTodays = removeTodayExact(todays);
        await updateTodayTasks(newTodays);
        return { ok: true };
      }

      default:
        return { ok: false, error: 'Unknown choice' };
    }
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

// --- Component ---

export default function DeleteTaskModal({ task, onClose }) {
  const [isOneOff, setIsOneOff] = useState(true);
  const [choices, setChoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const { id } = splitIdFromTitle(task.title);
    const oneOff = id === '000' || id == null;
    setIsOneOff(oneOff);

    if (oneOff) {
      setChoices([{ key: 'delete-this', label: 'Delete Today', hint: 'Remove this one-day task' }]);
    } else {
      setChoices([
        { key: 'delete-this', label: 'Delete This', hint: 'Remove only this today instance' },
        { key: 'delete-scheduling', label: 'Remove Schedule', hint: 'Stop future occurrences and remove this date' },
        { key: 'delete-all', label: 'Delete All', hint: 'Remove all today items for this ID and delete schedule' }
      ]);
    }
  }, [task]);

  async function onChoose(choiceKey) {
    setError('');
    setLoading(true);
    try {
      const res = await handleDeleteTask(task, choiceKey);
      if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'Delete failed');
      // notify app and close
      window.dispatchEvent(new Event('TodayTasksChanged'));
      window.dispatchEvent(new Event('ScheduledTasksChanged'));
      onClose({ ok: true, choice: choiceKey });
    } catch (err) {
      console.error('Delete failed', err);
      setError(err.message || String(err));
      setLoading(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop fade show"></div>

      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">

            <div className="modal-header">
              <h5 className="modal-title">Delete Task</h5>
              <button type="button" className="close" onClick={() => onClose({ ok: false })} aria-label="Close">
                <i className="material-icons">close</i>
              </button>
            </div>

            <div className="modal-body">
              <p style={{ marginBottom: 8 }}>
                {isOneOff ? 'One-day task — choose to delete it.' : 'Scheduled task — choose an action.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {choices.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    className={
                      c.key === 'delete-all' ? 'btn btn-danger' : c.key === 'delete-scheduling' ? 'btn btn-warning' : 'btn btn-outline-secondary'
                    }
                    onClick={() => onChoose(c.key)}
                    disabled={loading}
                    title={c.hint || ''}
                  >
                    {loading ? 'Processing...' : c.label}
                  </button>
                ))}
              </div>

              {error && <div className="alert alert-danger" style={{ marginTop: 12 }}>{error}</div>}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => onClose({ ok: false })} disabled={loading}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
