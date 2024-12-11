import toNumber from '@naverpay/hidash/toNumber'
import * as m from 'minimatch'
import prettyBytes from 'pretty-bytes'

import {getBooleanInput, getStringInput} from './aciton'
import {DependencyChange, Diff} from './diff'
import {i18nText} from './i18n'

function calculatePercentage(delta: number, originalSize: number): number {
    return Math.round((delta / originalSize) * 100)
}

function iconForDifference(delta: number, originalSize: number): string {
    if (originalSize === 0) {
        return '🆕'
    }

    const percentage = calculatePercentage(delta, originalSize)
    let icon = ''

    if (percentage >= 50) {
        icon = '🆘'
    }
    if (percentage >= 20) {
        icon = '🚨'
    }
    if (percentage >= 10) {
        icon = '⚠️'
    }
    if (percentage >= 5) {
        icon = '🔍'
    }
    if (percentage <= -50) {
        icon = '🏆'
    }
    if (percentage <= -20) {
        icon = '🎉'
    }
    if (percentage <= -10) {
        icon = '👏'
    }
    if (percentage <= -5) {
        icon = '✅'
    }

    if (percentage > 0) {
        icon += ' <sub>_(Size Increased)_</sub>'
    }
    if (percentage < 0) {
        icon += ' <sub>_(Size Decreased)_</sub>'
    }

    return icon
}

function getStatusText(diff: Diff) {
    const {before, after, delta} = diff
    if (delta === 0) {
        return i18nText('status_unchanged')
    }
    if (before === 0) {
        return i18nText('status_added')
    }
    if (after === 0) {
        return i18nText('status_removed')
    }
    return i18nText('status_modified')
}

function getDeltaText(delta: number, originalSize: number): string {
    const baseText = (delta > 0 ? '+' : '') + (delta === 0 ? '-' : prettyBytes(delta))

    if (Math.abs(delta) === 0 || originalSize === 0 || originalSize === -delta) {
        return baseText
    }
    const percentage = calculatePercentage(delta, originalSize)
    return `${baseText} (${percentage > 0 ? '+' : ''}${percentage}%)`
}

function createMarkdownTable(headers: string[], rows: string[][]): string {
    if (rows.length === 0) {
        return ''
    }
    const alignments = [':---', ...Array(headers.length - 1).fill(':---:')]
    return [headers, alignments, ...rows].map((columns) => `| ${columns.join(' | ')} |`).join('\n')
}

interface DiffTableOptions {
    showTotal: boolean
    collapseUnchanged: boolean
    omitUnchanged: boolean
    minimumChangeThreshold: number
    ignorePatterns?: string
    isPackages: boolean
}

function diffTable(
    files: Diff[],
    {showTotal, collapseUnchanged, omitUnchanged, minimumChangeThreshold, ignorePatterns, isPackages}: DiffTableOptions,
): string {
    const changedRows: string[][] = []
    const unChangedRows: string[][] = []
    let totalSize = 0
    let totalDelta = 0

    const title = isPackages ? i18nText('package_file') : i18nText('page_route')
    const headers = [
        title,
        i18nText('diff_status'),
        i18nText('before_size'),
        i18nText('after_size'),
        i18nText('size_changed'),
    ]

    for (const file of files) {
        const {filename, before, after, delta} = file
        const isIgnored = ignorePatterns ? m.minimatch(filename, ignorePatterns) : false
        if (isIgnored) {
            continue
        }

        totalSize += after
        totalDelta += delta

        const isUnchanged = Math.abs(delta) < minimumChangeThreshold

        if (isUnchanged && omitUnchanged) {
            continue
        }

        const row = [
            `**${filename}**`,
            `\`${getStatusText(file)}\``,
            `\`${before === 0 ? '-' : prettyBytes(before)}\``,
            `\`${after === 0 ? '-' : prettyBytes(after)}\``,
            `\`${getDeltaText(delta, before)}\``,
        ]

        if (isUnchanged && collapseUnchanged) {
            unChangedRows.push(row)
        } else {
            changedRows.push(row)
        }
    }

    let output = createMarkdownTable(headers, changedRows)

    if (unChangedRows.length > 0) {
        const unChangedOutput = createMarkdownTable(headers, unChangedRows)
        output += [
            '\n\n',
            '<details>',
            '<summary>',
            'ℹ️ ',
            '<strong>',
            `${isPackages ? i18nText('view_unchanged_package_files') : i18nText('view_unchanged_next')}`,
            '</strong>',
            '</summary>',
            '\n\n',
            unChangedOutput,
            '\n\n',
            '</details>',
            '\n\n',
        ].join('')
    }

    const totalOriginalSize = totalSize - totalDelta
    const totalDeltaText = getDeltaText(totalDelta, totalOriginalSize)
    const totalIcon = iconForDifference(totalDelta, totalOriginalSize)

    const totalChange = `**${i18nText('total_change')}:** ${totalDeltaText} ${totalIcon}`
    const total = showTotal
        ? [`**${i18nText('total_size')}:** ${prettyBytes(totalSize)}`, totalChange, '']
        : [totalChange, '']

    return `${total.join('\n\n')}${output}`
}

export function getMarkdownContent(
    nextDiffs: [string, Diff[]][],
    packageDiffs: Record<string, Diff[]>,
    packageDependenciesDiff: Record<string, DependencyChange[]>,
) {
    const markdownCommonOptions = {
        showTotal: getBooleanInput('show_total', true),
        collapseUnchanged: getBooleanInput('collapse_unchanged', true),
        omitUnchanged: getBooleanInput('omit_unchanged', false),
        ignorePatterns: getStringInput('ignore_patterns'),
    }
    const dependenciesChangeHeader = [
        i18nText('dependency_package'),
        i18nText('diff_status'),
        i18nText('previous_version'),
        i18nText('updated_version'),
        i18nText('bundle_size'),
        i18nText('size_changed'),
    ]

    const markdownContent = []

    for (let i = 0; i < nextDiffs.length; i++) {
        if (i === 0) {
            markdownContent.push('## NextJS Applications\n\n')
        }
        const [name, diffContents] = nextDiffs[i]
        const markdown = diffTable(diffContents, {
            ...markdownCommonOptions,
            minimumChangeThreshold: toNumber(getStringInput('minimum_change_threshold') || 1000),
            isPackages: false,
        })
        markdownContent.push([`### 📄 ${name} <sub>(nextjs static files diff)</sub>`, markdown].join('\n'))
    }

    const packageKeys = [...Object.keys(packageDiffs), ...Object.keys(packageDependenciesDiff)]
    const packageNames = packageKeys.filter((item, index) => packageKeys.indexOf(item) === index)

    let hasTitle = false

    for (const packageName of packageNames) {
        if (
            (packageDiffs?.[packageName]?.length > 0 || packageDependenciesDiff?.[packageName]?.length > 0) &&
            !hasTitle
        ) {
            hasTitle = true
            markdownContent.push('## NPM Packages\n\n')
        }

        if (packageDiffs?.[packageName]) {
            const diffContent = packageDiffs[packageName]
            if (diffContent.length === 0) {
                continue
            }
            const markdown = diffTable(diffContent, {
                ...markdownCommonOptions,
                minimumChangeThreshold: toNumber(getStringInput('minimum_change_threshold') || 10),
                isPackages: true,
            })
            markdownContent.push([`### 📦 ${packageName}`, markdown].join('\n'))
        }

        if (packageDependenciesDiff?.[packageName]) {
            const dependenciesChanges = packageDependenciesDiff[packageName]
            if (dependenciesChanges.length === 0) {
                continue
            }
            const rows = dependenciesChanges.map(
                ({package: pkg, type, previous, updated, bundleSizeText, diffText}) => {
                    const pkgName = `[\`${pkg}@${updated || previous}\`](https://bundlephobia.com/package/${pkg}@${updated})`
                    return [
                        pkgName,
                        `\`${i18nText(type)}\``,
                        `\`${previous || '-'}\``,
                        `\`${updated || '-'}\``,
                        bundleSizeText,
                        diffText,
                    ]
                },
            )
            const table = createMarkdownTable(dependenciesChangeHeader, rows)
            if (!packageDiffs?.[packageName]) {
                markdownContent.push(`### 📦 ${packageName}\n`)
            }
            markdownContent.push(['#### 🧩 Dependency Changes', table].join('\n\n'))
        }
    }

    return markdownContent.flat().join('\n')
}
