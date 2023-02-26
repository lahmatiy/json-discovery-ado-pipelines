/* eslint-env node */

function date(value) {
    if (!value) {
        return value;
    }

    return Date.parse(value);
}

function cleanupEntry(entry) {
    const result = {
        // previousAttempts: entry.previousAttempts,
        id: entry.id,
        parent: entry.parentId,
        // originalName: entry.originalName,
        name: entry.name,
        refName: entry.refName,
        logId: entry.logId,
        startTime: date(entry.startTime) || date(entry.finishTime),
        finishTime: date(entry.finishTime),
        // percentComplete: entry.percentComplete,
        state: entry.state,
        result: entry.result,
        // order: entry.order,
        // originalOrder: entry.originalOrder,
        workerName: entry.workerName,
        message: entry.message,
        // stateData: entry.stateData,
        issues: entry.issues?.length ? entry.issues : undefined
        // attempt: entry.attempt,
    };

    return result;
}

function cleanupEntryList(entryList, type) {
    return entryList
        .filter(entry => entry.type === type)
        .sort((a, b) => (date(a.startTime) - date(b.startTime)) || (a.name < b.name ? -1 : 1))
        .map(cleanupEntry);
}

export function cleanupPipelineData(rawData) {
    const params = JSON.parse(rawData.parameters || '{}');
    const data = {
        __originalData: rawData,
        // jobQueueData: rawData.jobQueueData,
        stages: cleanupEntryList(rawData.records, 'Stage'),
        phases: cleanupEntryList(rawData.records, 'Phase'),
        jobs: cleanupEntryList(rawData.records, 'Job'),
        tasks: cleanupEntryList(rawData.records, 'Task'),
        buildId: 'rawData.buildId',
        buildNumber: 'rawData.buildNumber',
        result: 'rawData.result',
        definitionId: 'rawData.definitionId',
        definitionName: 'rawData.definitionName',
        timelineId: 'rawData.timelineId',
        projectId: 'rawData.projectId',
        pullRequestId: 'pullRequestId' || params['system.pullRequest.pullRequestId'],
        branch: 'branch' || params['system.pullRequest.sourceBranch'].replace(
            /^refs\/heads\//,
            ''
        ),
        commit: 'commit' || params['system.pullRequest.sourceCommitId']
    };

    for (const job of data.jobs) {
        // job.queueData = rawData.jobQueueData[job.id] || null;
        if (job.id === job.parent) {
            job.id += '-job';
        }
    }

    return data;
}
