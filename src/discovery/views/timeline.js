function acceptTime(time) {
    return time && typeof time === 'number' && isFinite(time);
}

export default discovery => {
    discovery.view.define('timeline', function(el, config, data, context) {
        const stages = [...data]
            .filter(stage => acceptTime(stage.startTime) || acceptTime(stage.finishTime))
            .sort((a, b) => a.startTime - b.startTime);
        const startTime = Math.min(...stages.map(stage => stage.startTime));
        const finishTime = Math.max(...stages.map(stage => stage.finishTime));
        const duration = finishTime - startTime;

        // time ruler
        const timeRulerEl = el.appendChild(document.createElement('div'));
        const timeRulerStep = 10 * 60 * 1000;

        timeRulerEl.className = 'time-ruler';

        for (
            let time = 0;
            time < duration - timeRulerStep / 2;
            time += timeRulerStep
        ) {
            const lineEl = timeRulerEl.appendChild(document.createElement('div'));
            const h = Math.floor(time / (60 * 60 * 1000));
            const m = Math.floor(time / (60 * 1000)) % 60;
            const s = Math.floor(time / 1000) % 60;

            lineEl.className = 'line';
            lineEl.style.setProperty('--offset', time / duration);
            lineEl.dataset.title =
                (h ? `${h}:` : '') +
                [m, s].map(n => String(n).padStart(2, '0')).join(':');
        }

        for (const stage of stages) {
            const jobs = []
                .concat(...stage.children.map(phase => phase.children))
                .filter(
                    job =>
                        job.finishTime !== job.startTime &&
                        (job.children.length !== 1 || job.children[0].refName !== 'Delay')
                );

            if (jobs.length === 0) {
                continue;
            }

            const stageEl = document.createElement('div');
            const stageTitleEl = stageEl.appendChild(document.createElement('div'));

            stageEl.className = 'stage';
            stageTitleEl.className = 'stage__title';
            stageTitleEl.textContent = stage.name;

            for (const job of jobs) {
                const jobEl = document.createElement('div');
                const bodyEl = jobEl.appendChild(document.createElement('div'));

                jobEl.className = 'job';

                this.tooltip(
                    bodyEl,
                    ['text:name', 'html:"<br>"', 'text:duration.duration()'],
                    job,
                    context
                );
                bodyEl.classList.add('body');
                bodyEl.style.setProperty(
                    '--offset',
                    (job.startTime - startTime) / duration
                );
                bodyEl.style.setProperty(
                    '--width',
                    (job.finishTime - job.startTime) / duration
                );

                if (context.groupName) {
                    const tasks = job.children.filter(
                        task => task.groupName === context.groupName.groupName
                    );
                    for (const task of tasks) {
                        const taskEl = jobEl.appendChild(document.createElement('div'));
                        taskEl.classList.add('task');
                        taskEl.style.setProperty(
                            '--offset',
                            (task.startTime - startTime) / duration
                        );
                        taskEl.style.setProperty(
                            '--width',
                            (task.finishTime - task.startTime) / duration
                        );
                        this.tooltip(
                            taskEl,
                            ['text:name', 'html:"<br>"', 'text:duration.duration()'],
                            task,
                            context
                        );
                    }
                }

                stageEl.append(jobEl);
            }

            el.append(stageEl);
            el.classList.add('show__titles');
        }
    });
};
