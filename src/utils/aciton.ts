import * as core from '@actions/core'
import * as github from '@actions/github'

import {i18nText} from './i18n'

export function getStringInput(key: string, defaultValue?: string) {
    return core.getInput(key) || defaultValue
}

export function getBooleanInput(key: string, defaultValue: boolean): boolean {
    if (!core.getInput(key)) {
        return defaultValue
    }
    return core.getInput(key) === 'true'
}

export function startGroup(name: string) {
    core.startGroup(name)
}

export function endGroup() {
    core.endGroup()
}

export function setActionFailed(message: string) {
    core.setFailed(message)
}

export function getContext() {
    return github.context
}

export function getGithubToken() {
    const githubToken = getStringInput('github_token')
    if (!githubToken) {
        throw new Error(i18nText('no_github_token'))
    }
    return githubToken
}

export function getOctokit(): ReturnType<typeof github.getOctokit> {
    const token = getGithubToken()
    return github.getOctokit(token)
}

const SIZE_ACTION_CHECKSUM = 'naverpay size-action'

export async function createOrUpdatePRComment(pullNumber: number, commentBody: string) {
    const {
        repo: {owner, repo},
    } = getContext()
    const commonParams = {owner, repo, issue_number: pullNumber}
    const octokit = getOctokit()
    const {data: comments} = await octokit.rest.issues.listComments(commonParams)
    const prevComment = comments.find((comment) => comment?.body && comment.body.includes(SIZE_ACTION_CHECKSUM))

    const checksumComment = `<sub>powered by: <a href="https://github.com/NaverPayDev/size-action/blob/main/${i18nText(
        'readme',
    )}">${SIZE_ACTION_CHECKSUM}</a></sub>`

    const comment = {...commonParams, body: `${commentBody}\n\n${checksumComment}`}

    if (prevComment !== undefined) {
        await octokit.rest.issues.updateComment({...comment, comment_id: prevComment.id})
    } else {
        await octokit.rest.issues.createComment(comment)
    }
}
