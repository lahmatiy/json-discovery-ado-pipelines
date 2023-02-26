import { cleanupPipelineData } from './cleanup.js';
import { createQueryMethods } from "./query-helpers.js";

function processPipelineNodes(nodes, marker, map) {
    for (const node of nodes) {
        marker(node);

        if (map.has(node.id)) {
            console.warn(node.id, { new: node, old: map.get(node.id) });
        }

        map.set(node.id, node);

        node.groupName = node.name
            .replace(/\s+(shard\s*)?\d+/i, "")
            .replace(/^Evaluate\s+.+\s+for/, "Evaluate ... for")
            .replace(
                /^(Download secrets|Pre-job|Post-job|Publish Artifact): .+$/,
                "$1: ..."
            );
        node.duration = node.finishTime - node.startTime;
        node.children = [];
    }
}

export default function (data, {
    defineObjectMarker,
    addQueryHelpers,
    addValueAnnotation,
    query
}) {
    const pipeline = cleanupPipelineData(data);
    const stageMarker = defineObjectMarker("stage", { refs: ["id"] });
    const phaseMarker = defineObjectMarker("phase", { refs: ["id"] });
    const jobMarker = defineObjectMarker("job", { refs: ["id"] });
    const taskMarker = defineObjectMarker("task", { refs: ["id"] });
    const pipelineNodeById = new Map();

    processPipelineNodes(pipeline.stages, stageMarker, pipelineNodeById);
    processPipelineNodes(pipeline.phases, phaseMarker, pipelineNodeById);
    processPipelineNodes(pipeline.jobs, jobMarker, pipelineNodeById);
    processPipelineNodes(pipeline.tasks, taskMarker, pipelineNodeById);

    for (const node of pipelineNodeById.values()) {
        node.parent = pipelineNodeById.get(node.parent) || null;
        if (node.parent) {
            node.parent.children.push(node);
        }
    }

    pipeline.nodes = [
        ...pipeline.stages,
        ...pipeline.phases,
        ...pipeline.jobs,
        ...pipeline.tasks,
    ];

    // addValueAnnotation(
    //     `#.key = "prNum" and $ ? {
    //         text: "Open in ADO",
    //         href: prHref(),
    //         external: true
    //     } : null`
    // );
    addValueAnnotation('#.key = "duration" ? duration() : null');
    addValueAnnotation(
        '$ != null and (#.key = "startTime" or #.key = "finishTime") ? date() : null'
    );
    // addValueAnnotation('#.key = "parentId" ? marker().type : null');

    addQueryHelpers(createQueryMethods(query));

    return pipeline;
}
