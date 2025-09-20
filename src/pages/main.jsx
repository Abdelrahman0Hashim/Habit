// src/pages/Main.jsx
import React, { useEffect, useState } from 'react';
import './Main.css';
import TaskList   from '../components/TaskList';
import OldTasks   from '../components/oldTasks';
import Add      from '../components/add';

// ⬇️ import the updated functions
import {
  loadTodayTasks,
  ensureGistExists,
  ensureRequiredFiles
} from '../services/gistService';

import { runOncePerDay } from '../utils/daily';
import { runScheduledTasksOnce } from '../services/scheduler';


export default function Main() {
  const [date, setDate]       = useState('');
  const [tasks, setTasks]     = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  
  // 1. Set the current date once
  useEffect(() => {
    setDate(new Date().toLocaleDateString('en-US'));
  }, []);

  // 2. On mount: create/verify Gist → patch files → load tasks
  useEffect(() => {
    (async () => {
      try {
        // creates the Gist if it's missing (or recreates on 404)
        await ensureGistExists();

        // adds any missing JSON files (only runs on first login or when you add new files)
        await ensureRequiredFiles();

        // finally, load today's tasks into state
        const today = await loadTodayTasks();
        setTasks(today);
      } catch (err) {
        console.error('Initialization failed:', err);
      }
    })();
  }, []);

  useEffect(() =>{
    const dailyJob=async () =>{
      try{
        await ensureRequiredFiles();
        await runScheduledTasksOnce()
        const fresh = await loadTodayTasks();
        setTasks(fresh);
      }catch(e){
        console.error('Daily job error:',e)
      }
    };

    runOncePerDay(dailyJob);

    const tryRun = () => runOncePerDay(dailyJob);

    const onVisibility = () =>{
      if(document.visibilityState === 'visible') tryRun();
    };
    window.addEventListener('focus',tryRun);
    document.addEventListener('visibilitychange',onVisibility);

    return () =>{
      window.removeEventListener('focus',tryRun);
      document.removeEventListener('visibilitychange',onVisibility);
    }
  },[])

  // 3. Listen for external “TodayTasksChanged” events to reload
  useEffect(() => {
    const handleReload = async () => {
      try {
        const fresh = await loadTodayTasks();
        setTasks(fresh);
      } catch (e) {
        console.error("Failed to reload tasks:", e);
      }
    };
    window.addEventListener('TodayTasksChanged', handleReload);
    return () => window.removeEventListener('TodayTasksChanged', handleReload);
  }, []);

  // 4. When Add emits a new task, append it locally
  const handleAddTask = newTask => {
    setTasks(prev => [...prev, newTask]);
    setShowAdd(false);
  };

  return (
    <>
      <div className="entry">
        <h1>Tasks For {date}</h1>
        <button
          type="button"
          className="btn btn-primary btn-lg rounded-circle shadow position-fixed bottom-0 end-0 m-3 The"
          onClick={() => setShowAdd(true)}
        >
          +
        </button>
        
      </div>

      {showAdd && (
        <Add
          onAdd={handleAddTask}
          onCancel={() => setShowAdd(false)}
        />
      )}

      

      <div className="today-plan">
        <TaskList tasks={tasks} matchDate={date} />
      </div>

      <div className="oldTasks">
        <h2>Old Tasks</h2>
        <OldTasks tasks={tasks} todaysDate={date} />
      </div>
    </>
  );
}
