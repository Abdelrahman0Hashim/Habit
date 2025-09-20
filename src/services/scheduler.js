import {
    loadScheduledTasks,
    createTodayTask
} from './gistService';

function to3Digits(n){
    return String(Number(n)).padStart(3,'0');
}

export async function runScheduledTasksOnce() {
    const ScheduledTasks = await loadScheduledTasks();
    if(!ScheduledTasks || ScheduledTasks.length ===0 ) return;

    const todayStr = new Date().toISOString().slice(0,10);
    const todayDate = new Date(todayStr + 'T00:00:00');

    for (const task of ScheduledTasks){
        const {id,start , end , freq , selectedDays=[],interval}=task;
        let shouldRun=false;

        if(freq === 'once'){
            if(start === todayStr) shouldRun=true;
        }else{
            const startDate = new Date(start + 'T00:00:00');
            const endDate =end ? new Date(end + 'T00:00:00') : todayDate;

            if(todayDate < startDate || todayDate > endDate) continue;

            if(freq === 'daily')  shouldRun= true;
            else if (freq === 'weekly'){
                const todayName = todayDate.toLocaleDateString('en-US',{weekday: 'short'});
                if(selectedDays.length > 0){
                    const normalized = selectedDays.map(d =>
                        d.slice(0.1).toUpperCase()+d.slice(1,3).toLowerCase()
                    );
                    shouldRun = normalized.includes(todayName);
                }else if(interval){
                    const diffDays = Math.floor((todayDate-startDate)/(1000*60*60*24));
                    shouldRun= diffDays >= 0 && diffDays % Number(interval)===0;
                }
            }else if(freq === 'monthly'){
                shouldRun=todayDate.getDate() === Number(interval);
            }
        }

        if(shouldRun){
            const safeId=id==null? '':to3Digits(id);
            const separator=task.title && task.title.trim()?' ':'';
            const todayTask={
                title: `${task.title ||''}${separator}${safeId}`,
                group:task.group || null,
                date: todayStr,
                done: 'false'
            };

            try{
                await createTodayTask(todayTask);
                window.dispatchEvent(new Event('TodayTasksChanged'));
            }catch(e){
                console.error('Error creating today task: ',e);
            }
        }
    }

}