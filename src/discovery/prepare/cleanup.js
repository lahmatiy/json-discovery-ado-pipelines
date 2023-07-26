/* eslint-env node */

const now = Date.now();

function date(value) {
    if (!value) {
        return value;
    }

    return Date.parse(value);
}

function cleanupEntry(entry) {
    const startTime = date(entry.startTime) || date(entry.finishTime);
    const result = {
        // previousAttempts: entry.previousAttempts,
        id: entry.id,
        parent: entry.parentId,
        // originalName: entry.originalName,
        name: entry.name,
        refName: entry.refName,
        logId: entry.logId,
        startTime: startTime,
        finishTime: startTime ? date(entry.finishTime) || now : null,
        // percentComplete: entry.percentComplete,
        state: entry.state,
        result: entry.result || (entry.state === 'inProgress' ? 'in progress' : null),
        // order: entry.order,
        // originalOrder: entry.originalOrder,
        workerName: entry.workerName?.replace(/\s+\d+$/, ''),
        message: entry.message,
        // stateData: entry.stateData,
        issues: entry.issues?.length ? entry.issues : undefined,
        __entry: entry
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
        stages: cleanupEntryList(rawData.records, 'Stage', now),
        phases: cleanupEntryList(rawData.records, 'Phase', now),
        jobs: cleanupEntryList(rawData.records, 'Job', now),
        tasks: cleanupEntryList(rawData.records, 'Task', now),
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
