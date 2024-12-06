import * as path from 'node:path'

import {analyze} from './analyze'
import {
    createOrUpdatePRComment,
    endGroup,
    getContext,
    getStringInput,
    setActionFailed,
    startGroup,
} from './utils/aciton'
import {getNextJSDiff, getPackageJSONDiff, getPackagesDiff} from './utils/diff'
import {initI18n, i18nText} from './utils/i18n'
import {getMarkdownContent} from './utils/markdown'

async function main() {
    const language = getStringInput('language') || 'en'

    if (!['en', 'ko'].includes(language)) {
        const unsupportedLanguage = `An unsupported language value has been provided. Please use either \`en\` or \`ko\`. (Current value: ${language})`
        setActionFailed(unsupportedLanguage)
        return
    }

    await initI18n(language)

    const context = getContext()
    const {pull_request: pullRequest} = context.payload

    if (!pullRequest) {
        setActionFailed(i18nText('not_pull_request_action'))
        return
    }

    // TODO: merge 여부나, mergeable 여부 확인이 필요한지?
    const {state, number: pullNumber /* merged, mergeable, mergeable_state */} = pullRequest

    if (state === 'closed') {
        setActionFailed(i18nText('closed_pull_request'))
        return
    }

    const cwd = getStringInput('cwd')
    if (cwd) {
        startGroup('Set Current Working Directory')
        process.chdir(cwd)
        endGroup()
    }

    startGroup('Install and Build in Parallel')
    const {
        base: {
            ref: baseBranch,
            repo: {clone_url: gitUrl},
        },
        head: {ref: headBranch},
    } = pullRequest

    try {
        const [
            {packages: basePackages, next: baseNextJS, packageJSONs: basePackageJSONs},
            {packages: headPackages, next: headNextJS, packageJSONs: headPackageJSONs},
        ] = await Promise.all([
            analyze({workingDirectory: path.join(process.cwd(), '.base'), gitUrl, branch: baseBranch}),
            analyze({workingDirectory: path.join(process.cwd(), '.head'), gitUrl, branch: headBranch}),
        ])

        const nextDiff = getNextJSDiff(baseNextJS, headNextJS)
        const packagesDiff = getPackagesDiff(basePackages, headPackages)
        const packageDependenciesDiff = await getPackageJSONDiff(basePackageJSONs, headPackageJSONs)

        const markdownContent = getMarkdownContent(nextDiff, packagesDiff, packageDependenciesDiff)

        if (markdownContent.length === 0) {
            const commitComment = pullRequest.head?.sha
                ? [`${i18nText('empty_latest_commit')} ${pullRequest.head.sha}`]
                : []
            const emptyComment = [i18nText('empty_title'), ...commitComment, i18nText('empty_check_commit')].join(
                '\n\n',
            )
            await createOrUpdatePRComment(pullNumber, emptyComment)
            return
        }

        await createOrUpdatePRComment(pullNumber, markdownContent)
    } catch (error) {
        if (error instanceof Error) {
            setActionFailed(error.message)
        }
    }

    endGroup()
}

main().catch((error) => {
    const internalServerError = [i18nText('internal_server_error'), '', '', JSON.stringify(error, undefined, 2)].join(
        '\n',
    )
    setActionFailed(internalServerError)
})
