import React, { useMemo, useState } from "react";
import "./old.css"; // you can remove most of this now

export default function OldTasks({ tasks, todaysDate }) {
  // … your useMemo and grouping logic unchanged …

  const oldTasks = useMemo(
    () => tasks.filter(t => new Date(t.date) < new Date(todaysDate)),
    [tasks, todaysDate]
  );
  const tasksByDate = oldTasks.reduce((map, task) => {
    const datekey = task.date;
    const groupKey = task.group || "ungrouped";
    if (!map[datekey]) map[datekey] = {};
    if (!map[datekey][groupKey]) map[datekey][groupKey] = [];
    map[datekey][groupKey].push(task);
    return map;
  }, {});
  const dateKey = useMemo(
    () =>
      Object.entries(tasksByDate).sort(
        ([a], [b]) => new Date(b) - new Date(a)
      ),
    [tasksByDate]
  );

  const [activeGroups, setActiveGroups] = useState({});
  if (dateKey.length === 0) return null;

  // track which group is open for each date
  

  function mainOldTasksView() {
    return dateKey.map(([dateLabel, groups]) => {
      const active = activeGroups[dateLabel] || null;
      const groupNames = Object.keys(groups);

      // 1) GROUP VIEW
      if (active) {
        return (
          <div key={dateLabel} className="card mb-4">
            <div className="card-header d-flex align-items-center">
              <button
                className="btn btn-link text-decoration-none p-0 me-2"
                onClick={() =>
                  setActiveGroups(prev => ({
                    ...prev,
                    [dateLabel]: null,
                  }))
                }
              >
                <i className="material-icons">arrow_back</i>
              </button>
              <h5 className="mb-0">{active}</h5>
            </div>
            <ul className="list-group list-group-flush">
              {groups[active].map((task, idx) => (
                <li
                  key={`${dateLabel}_${active}_${idx}`}
                  className="list-group-item d-flex align-items-center"
                >
                  <input
                    className="form-check-input me-3"
                    type="checkbox"
                    checked={task.done === 'true'}
                    disabled
                  />
                  <span>{task.title.slice(0,-3)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      }

      // 2) MAIN VIEW
      return (
        <div key={dateLabel} className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">{dateLabel}</h5>
          </div>

          <div className="card-body">
            <div className="btn-group mb-3" role="group">
              {groupNames.map(name => (
                <button
                  key={name}
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() =>
                    setActiveGroups(prev => ({
                      ...prev,
                      [dateLabel]: name,
                    }))
                  }
                >
                  {name}
                </button>
              ))}
            </div>

            <ul className="list-group list-group-flush">
              {(groups["ungrouped"] || []).map((task, idx) => (
                <li
                  key={`${dateLabel}_ungrouped_${idx}`}
                  className="list-group-item d-flex align-items-center"
                >
                  <input
                    className="form-check-input me-3"
                    type="checkbox"
                    checked={task.done === 'true'}
                    disabled
                  />
                  <span>{task.title.slice(0,-3)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    });
  }

  return <div className="container py-4">{mainOldTasksView()}</div>;
}
