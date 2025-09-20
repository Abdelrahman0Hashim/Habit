// src/components/Add.jsx
import React, { useState, useMemo,useEffect } from 'react'
import './add.css'
import {
  createTodayTask,
  createScheduledTask,
  loadTodayTasks,
  ensureGistExists,
  ensureRequiredFiles,
  loadScheduledTasks
}from '../services/gistService.js'


function to3Digits(n){
  return String(Number(n)).padStart(3,'0');
}
export default function Add({ onCancel }) {
  const [freq, setFreq] = useState('once');
  const [start, setStart] = useState('');
  const [interval, setInterval] = useState('');
  const [selectedDays, setSelected] = useState([]);
  const [end, setEnd] = useState('');
  const [dateError, setDateError] = useState('');
  const [ScheduledTasks, setScheduledTasks] = useState([]);

  const [value, setValue] = useState({ task: '', group: '' });
  const [error, setError] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    (async () => {
      try {
        await ensureGistExists();
        await ensureRequiredFiles();
        const futureTask = await loadScheduledTasks();
        setScheduledTasks(futureTask);
      } catch (err) {
        console.error('Initialization failed:', err);
      }
    })();
  }, []);

  // safe create: checks if identical today task exists first
  async function safeCreateTodayTask(task) {
    const todays = await loadTodayTasks();
    const exists = todays.some(
      t =>
        t.title === task.title &&
        t.date === task.date &&
        (t.group || null) === (task.group || null)
    );
    if (exists) return { created: false, reason: 'exists' };
    await createTodayTask(task);
    return { created: true };
  }

  const handleSubmit = async e => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    
    const startsToday=(start || todayKey) === todayKey;
    const isOneOff = freq ==='once' && startsToday;

    const scheduledId = isOneOff ? 0:(ScheduledTasks? ScheduledTasks.length +1 : 1);
    const id3 = to3Digits(scheduledId);

    const newTask = {
      id: id3,
      title: value.task.trim(),
      group: value.group.trim() || null,
      start: start || todayKey,
      end: end || null,
      freq,
      interval: interval || null,
      selectedDays
    };
    

    const todayTask = {
      title: `${value.task.trim()}${id3}`,
      group: value.group.trim() || null,
      date: todayKey,
      done: 'false'
    };

    try {
      // CASE A: one-off task starting today (just a today task)
      if (newTask.start === todayKey && freq === 'once') {
        await safeCreateTodayTask(todayTask);
        window.dispatchEvent(new Event('TodayTasksChanged'));
      } else {
        // create scheduled task first
        await createScheduledTask(newTask);

        // if scheduled task starts today, also ensure today task exists but avoid duplication
        if (newTask.start === todayKey) {
          await safeCreateTodayTask(todayTask);
          window.dispatchEvent(new Event('TodayTasksChanged'));
        }

        window.dispatchEvent(new Event('ScheduledTasksChanged'));
      }
    } catch (err) {
      console.error('Error adding task', err);
    } finally {
      setSubmitting(false);
      onCancel();
    }
  };

  useEffect(() => {
    if (start && end) {
      setDateError(end < start ? 'End date cannot be before the start date' : '');
    } else {
      setDateError('');
    }
  }, [start, end]);

  // Calculate days in month for "Monthly" freq
  const daysInMonth = useMemo(() => {
    if (freq === 'monthly' && start) {
      const d = new Date(start);
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    }
    return 31;
  }, [freq, start]);

  // Derived input attrs + placeholders
  const intervalMin = freq === 'once' ? 0 : 1;
  const intervalMax =
    freq === 'weekly' ? 5 : freq === 'monthly' ? daysInMonth : undefined;

  let intervalPlaceholder = '';
  if (freq === 'once') intervalPlaceholder = 'Disabled';
  if (freq === 'weekly') intervalPlaceholder = '1–5 days or pick weekdays';
  if (freq === 'monthly') intervalPlaceholder = `1–${daysInMonth}`;

  // Disable logic
  const disableInterval = freq === 'once' || selectedDays.length > 0;
  const disableDays = interval !== '';
  const disableEnd = freq === 'once';

  function handleFreqChange(e) {
    setFreq(e.target.value);
    setInterval('');
    setSelected([]);
  }

  function handleStartChange(e) {
    setStart(e.target.value);
  }

  function handleEndChange(e) {
    setEnd(e.target.value);
  }

  function handleIntervalChange(e) {
    setInterval(e.target.value);
    if (e.target.value) setSelected([]);
  }

  function handleInputChange(event) {
    const { name, value: raw } = event.target;
    const filtered = raw.replace(/[^a-zA-Z0-9 ]/g, '');
    setValue(prev => ({ ...prev, [name]: filtered }));
    setError(prev => ({
      ...prev,
      [name]: filtered !== raw ? 'Special characters are not allowed.' : ''
    }));
  }

  function toggleDay(day) {
    setSelected(curr => (curr.includes(day) ? curr.filter(d => d !== day) : [...curr, day]));
    setInterval('');
  }

  const weekdays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  return (
    <>
      
      <div className="modal-backdrop fade show"></div>

      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog" role="document">
          <div className="modal-content">

            {/* Header */}
            <div className="modal-header">
              <h5 className="modal-title">Add Task</h5>
              <button
                type="button"
                className="close"
                onClick={onCancel}
                aria-label="Close"
              >
                <i className="material-icons">close</i>
              </button>
            </div>

            {/* Body/Form */}
            <div className="modal-body">
              <form
                onSubmit={handleSubmit}
              >
                    {['task','group'].map(field =>(
                        <div key={field} className='form-group'>
                            <label htmlFor={field} className='title'>{field}</label>
                            <input
                            id={field}
                            name={field}
                            type="text"
                            className='form-control'
                            value={value[field]}
                            onChange={handleInputChange}
                            />
                            <p style={{color: 'red'}}>{error[field]}</p>
                        </div>
                    ))}
                  
                
                
                <div className="form-row">
                  <div className="form-group col">
                    <label htmlFor="start">Start Date</label>
                    <input
                      id="start"
                      name="start"
                      type="date"
                      className="form-control"
                      value={start}
                      onChange={handleStartChange}
                    />
                  </div>
                  <div className="form-group col">
                    <label htmlFor="end">End Date</label>
                    <input
                    name="end"
                    id="end"
                    type="date"
                    className={
                      'form-control' + (dateError ? ' is-invalid' : '')
                    }
          value={end}
          onChange={handleEndChange}
          min={start || undefined}   
          disabled={disableEnd}    // Blocks dates before start
          onInvalid={e => setDateError(e.target.validationMessage)}
        />
        <div className="invalid-feedback">
          {dateError || 'Please choose an end date'}
        </div>
                  </div>
                </div>

                {/* Frequency radios */}
                <fieldset className="form-group">
                  <legend className="col-form-label">Frequency</legend>
                  {['once', 'daily', 'weekly', 'monthly'].map(f => (
                    <div className="form-check form-check-inline" key={f}>
                      <input
                        className="form-check-input"
                        type="radio"
                        name="freq"
                        id={`freq-${f}`}
                        value={f}
                        checked={freq === f}
                        onChange={handleFreqChange}
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`freq-${f}`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </label>
                    </div>
                  ))}
                </fieldset>

                {/* Weekly: day toggles */}
                {freq === 'weekly' && (
                  <div className="form-group">
                    <label className="d-block">Pick Weekdays</label>
                    <div className="btn-group" role="group">
                      {weekdays.map(d => (
                        <button
                          key={d}
                          type="button"
                          className={
                            'btn btn-outline-primary' +
                            (selectedDays.includes(d) ? ' active' : '')
                          }
                          disabled={disableDays}
                          onClick={() => toggleDay(d)}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interval input */}
                <div className="form-group">
                  <label htmlFor="interval">Interval</label>
                  <input
                    id="interval"
                    name="interval"
                    type="number"
                    className="form-control"
                    min={intervalMin}
                    max={intervalMax}
                    placeholder={intervalPlaceholder}
                    disabled={disableInterval}
                    value={interval}
                    onChange={handleIntervalChange}
                  />
                </div>

                {/* Footer */}
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onCancel}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Task
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
