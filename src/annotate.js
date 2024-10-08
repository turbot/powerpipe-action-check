import { endGroup, startGroup } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { info } from "console";
import { readFile } from "fs/promises";
import * as utils from "./utils";

export async function processAnnotations(input) {
  startGroup("Processing output");
  info("Fetching output");
  const jsonFiles = await utils.getExportedJSONFiles(input);
  const annotations = [];
  for (let j of jsonFiles) {
    const result = await parseResultFile(j);
    annotations.push(...getAnnotations(result));
  }

  info(`Pushing Annotations`);
  await pushAnnotations(input, annotations);
  utils.removeFiles(jsonFiles);
  endGroup();
}

/**
 * Returns an array of annotations for a RootResult
 *
 * @param group GroupResult The group result returned by `powerpipe control/benchmark run`
 * @returns
 */
export function getAnnotations(result) {
  if (result === null) {
    return null;
  }
  return getAnnotationsForGroup(result);
}

export async function parseResultFile(filePath) {
  const fileContent = await readFile(filePath);
  return JSON.parse(fileContent.toString());
}

/**
 * Pushes the annotations to Github.
 *
 * @param annotations Array<Annotation> Pushed a set of annotations to github
 */
export async function pushAnnotations(input, annotations) {
  const octokit = getOctokit(input.token);
  if (annotations === null || annotations.length === 0) {
    return;
  }

  const chunks = [];

  for (let ann of annotations) {
    if (chunks.length == 0) {
      // push in the first one
      chunks.push([]);
    }

    // check if the last one has reached limit
    if (chunks[chunks.length - 1].length > 49) {
      chunks.push([]);
    }

    // push this one to the last one
    chunks[chunks.length - 1].push(ann);
  }

  const checkCore = {
    ...context.repo,
    check_run_id: context.runId,
    name: "powerpipe-check",
    status: "completed",
    conclusion: "action_required",
  }

  if (context.payload.pull_request) {
    checkCore.pull_number = context.payload.pull_request.number;
    checkCore.head_sha = context.payload.pull_request.head.sha;
  } else {
    checkCore.head_sha = context.sha;
  }

  for (let chunk of chunks) {
    checkCore.output = {
      title: "Powerpipe Check",
      summary: "Control check failed",
      annotations: chunk,
    }
    await octokit.rest.checks.create(checkCore);
  }
}

function getAnnotationsForGroup(group) {
  const annotations = [];
  if (group.groups) {
    for (let g of group.groups) {
      const ann = getAnnotationsForGroup(g);
      annotations.push(...ann);
    }
  }
  if (group.controls) {
    for (let c of group.controls) {
      const ann = getAnnotationsForControl(c);
      annotations.push(...ann);
    }
  }
  return annotations;
}

function getAnnotationsForControl(controlRun) {
  const regex = new RegExp("^(.*?):(\\d+)(?:-(\\d+))?$");
  const annotations = [];

  for (let result of controlRun.results || []) {
    if (result.status != "alarm" && result.status != "error") {
      continue;
    }

    for (let dim of result.dimensions || []) {
      if ((dim.value || "").trim().length == 0) {
        continue;
      }

      const match = (dim.value || "").match(regex);
      if (match) {
        const fileName = match[1];
        const startLine = parseInt(match[2]);
        const endLine = startLine // match[3] ? parseInt(match[3]) : startLine;
        // NOTE: Setting endLine moves the annotations to the end line rather than the start line, so set to startLine for now.
        annotations.push({
          path: fileName.replace(process.cwd() + "/", ""),
          start_line: parseInt(startLine),
          end_line: parseInt(endLine),
          annotation_level: "failure",
          message: result.reason,
          title: controlRun.title,
        });
      }
    }
  }

  return annotations;
}
