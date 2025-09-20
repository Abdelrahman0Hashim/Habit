import React, { useState, useEffect, useMemo } from 'react';
import { loadTodayTasks, updateTodayTasks } from '../services/gistService';
import DeleteTaskModal from './delete'; // ensure file name matches

function isSame(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalize(s) {
  return (s || '').trim().toLowerCase().replace(/\s/g, ' ');
}

function matchTask(a, b) {
  return (
    normalize(a.title) === normalize(b.title) &&
    normalize(a.group || '') === normalize(b.group || '') &&
    a.date === b.date
  );
}

export default function TaskList({ tasks, matchDate }) {
  // 1. Filter by date
  const filtered = useMemo(
    () => (tasks || []).filter(t => isSame(new Date(t.date), new Date(matchDate))),
    [tasks, matchDate]
  );

  const [taskToDelete, setTaskToDelete] = useState(null);

  // 2. Group tasks into [{ key, tasks }]
  const groupedTasks = useMemo(() => {
    return filtered.reduce((acc, task) => {
      const key = task.group || 'No-group';
      let groupObj = acc.find(g => g.key === key);
      if (!groupObj) {
        groupObj = { key, tasks: [] };
        acc.push(groupObj);
      }
      groupObj.tasks.push(task);
      return acc;
    }, []);
  }, [filtered]);

  // 3. Order real groups first, then No-group
  const orderedGroups = useMemo(
    () => [
      ...groupedTasks.filter(g => g.key !== 'No-group'),
      ...groupedTasks.filter(g => g.key === 'No-group')
    ],
    [groupedTasks]
  );

  const [expanded, setExpanded] = useState({});
  const toggleGroup = key => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const [localTasks, setLocalTasks] = useState(filtered);
  const [savingMap, setSavingMap] = useState({});

  useEffect(() => {
    setLocalTasks(filtered);
    setSavingMap({});
  }, [filtered]);

  function findLocalIndex(task) {
    return localTasks.findIndex(t => matchTask(t, task));
  }

  async function handleClick(clickedTask) {
    const localIdx = findLocalIndex(clickedTask);
    if (localIdx === -1) return;
    if (savingMap[localIdx]) return;

    const nextLocal = localTasks.slice();
    const newDone = nextLocal[localIdx].done === 'true' ? 'false' : 'true';
    nextLocal[localIdx] = { ...nextLocal[localIdx], done: newDone };
    setLocalTasks(nextLocal);
    setSavingMap(m => ({ ...m, [localIdx]: true }));

    try {
      const remote = await loadTodayTasks();
      const remoteIdx = remote.findIndex(t => matchTask(t, clickedTask));

      if (remoteIdx === -1) {
        await updateTodayTasks(remote.concat([{ ...nextLocal[localIdx] }]));
      } else {
        const remoteNext = remote.slice();
        remoteNext[remoteIdx] = { ...remoteNext[remoteIdx], done: newDone };
        await updateTodayTasks(remoteNext);
      }
      window.dispatchEvent(new Event('TodayTasksChanged'));
    } catch (e) {
      console.error('Failed to flip done state', e);

      setLocalTasks(prev => {
        const rb = prev.slice();
        rb[localIdx] = {
          ...rb[localIdx],
          done: rb[localIdx].done === 'true' ? 'false' : 'true'
        };
        return rb;
      });
    } finally {
      setSavingMap(m => {
        const copy = { ...m };
        delete copy[localIdx];
        return copy;
      });
    }
  }

  // When a deletion succeeds, reload today tasks from storage and update local state
  async function reloadTodayTasksIntoLocal() {
    try {
      const todays = (await loadTodayTasks()) || [];
      // update localTasks to only tasks that match the current matchDate
      const reFiltered = todays.filter(t => isSame(new Date(t.date), new Date(matchDate)));
      setLocalTasks(reFiltered);
      // also dispatch event in case other parts of the app want to refresh
      window.dispatchEvent(new Event('TodayTasksChanged'));
    } catch (err) {
      console.error('Failed to reload today tasks', err);
    }
  }

  // 4. Render
  return (
    <>
      <div>
        {orderedGroups.map(({ key, tasks }) => {
          const isUngrouped = key === 'No-group';

          return (
            <div key={key} style={{ marginBottom: 16 }}>
              {!isUngrouped && (
                <button
                  onClick={() => toggleGroup(key)}
                  aria-expanded={!!expanded[key]}
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    padding: '9px 10px',
                    background: '#f7f7f7',
                    border: '1px solid #ccc',
                    cursor: 'pointer',
                    color: 'black'
                  }}
                >
                  {key}
                </button>
              )}

              {(isUngrouped || expanded[key]) && (
                <div
                  style={{
                    padding: '8px 12px',
                    border: isUngrouped ? 'none' : '2px solid #eee',
                    borderTop:0,
                    marginLeft:0
                  }}
                >
                  {tasks.map((task, i) => {
                    const localIdx = findLocalIndex(task);
                    const saving = !!savingMap[localIdx];
                    const current = localIdx !== -1 ? localTasks[localIdx] : task;
                    const displayTitle =
                      typeof task.title === 'string' && task.title.length > 3
                        ? task.title.slice(0, -3)
                        : task.title || '';

                    return (
                      <label
                        key={`${key}-${i}`}
                        htmlFor={`task-${key}-${i}`}
                        style={{
                          display: 'block',
                          margin: '4px 0',
                          color: 'black'
                        }}
                      >
                        <input
                          type="checkbox"
                          id={`task-${key}-${i}`}
                          checked={current && current.done === 'true'}
                          disabled={saving}
                          onChange={() => handleClick(task)}
                        />{' '}
                        <span style={{ marginRight: 8 }}>{displayTitle}</span>
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(task)}
                          style={{
                            color: 'gray',
                            fontSize: 18,
                            background: 'transparent',
                            cursor: 'pointer',
                            border: 'none'
                          }}
                          aria-label="Delete task"
                        >
                          x
                        </button>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && <p>No tasks for {matchDate}</p>}
      </div>

      {taskToDelete && (
        <DeleteTaskModal
          task={taskToDelete}
          onClose={async ({ ok } = {}) => {
            setTaskToDelete(null);
            if (ok) {
              // reload todaystask.json into local state so UI updates immediately
              await reloadTodayTasksIntoLocal();
            }
          }}
        />
      )}
    </>
  );
}
