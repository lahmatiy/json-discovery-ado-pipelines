import { createPathNodeGetter } from '../prepare/tree.js';
// import { nextMonth, labelMonth } from './utils.js';

const indicatorList = {
    view: 'inline-list',
    item: 'indicator{ value: "text-numeric:value" }',
    data: `.($type; {
      label: title,
      value: query.query(#.data, #) |
          $type = "asis" ? $ :
          $type = "percent" ? percent() :
          size(),
      href: href or pageLink('report', { query, view, noedit: view.bool(), title })
    })`
};

export default discovery => {
    discovery.on('data', () => {
        discovery.context.pipelineNode = createPathNodeGetter({
            rootRef: null,
            getParentRef: entity => entity?.parentId || null
        });
    });

    discovery.page.define('default', [
        {
            view: 'page-header',
            content: [
                'h1:"ADO pipeline viewer prototype"'
            ]
        },

        {
            view: 'section',
            header: [],
            content: {
                view: 'context',
                data: [
                    {
                        title: 'Run duration',
                        type: 'asis',
                        query: 'stages.max(=>finishTime) - stages.min(=>startTime) | duration()'
                    },
                    {
                        title: 'All jobs duration',
                        type: 'asis',
                        query: 'jobs.sum(=>duration) | duration()'
                    },
                    { title: 'Tasks', query: 'tasks' },
                    { title: 'Jobs', query: 'jobs' },
                    { title: 'Stages', query: 'stages' }
                ],
                content: indicatorList
            }
        },

        'h2:"Jobs timeline"',
        {
            view: 'block',
            className: 'timeline-box',
            content: {
                view: 'context',
                modifiers: [
                    {
                        view: 'content-filter',
                        name: 'groupNameFilter',
                        data: `
                            tasks.group(=>groupName).({
                                groupName: key,
                                tasks: value,
                                duration: value.sum(=>duration)
                            }).sort(duration desc)
                        `,
                        content: {
                            view: 'menu',
                            name: 'groupName',
                            data: '.[groupName ~= #.groupNameFilter]',
                            limit: false,
                            item: ['badge:duration.duration()', 'text:groupName']
                        }
                    }
                ],
                content: 'timeline:stages'
            }
        },

        'h2:"Task aggregation"',
        {
            view: 'table',
            data: `
                $totalDuration: tasks.sum(=>duration);

                tasks.group(=>groupName)
                    .($duration: value.sum(=>duration); $parentDur: value.parent.sum(=>duration); {
                    task: key,
                    $duration,
                    count: value.size(),
                    avgDuration: $duration / value.size(),
                    $totalDuration,
                    parentFraction: ($duration / $parentDur).percent(),
                    tasks: value
                    })
                    .sort(duration desc)
            `,
            cols: {
                totalDuration: false,
                duration: {
                    sorting: 'duration desc',
                    content: 'value-fraction:{ value: duration, format: => duration(), total: totalDuration }'
                },
                avgDuration: {
                    className: 'number',
                    sorting: 'avgDuration desc',
                    content: 'text-numeric:avgDuration.duration()'
                }
            }
        },

        'h2:"Pipeline tree"',
        {
            view: 'tree',
            data: 'stages',
            expanded: 2,
            item: ['text:name + " "', 'badge:duration.duration()']
        }
    ]);
};
