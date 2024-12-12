/* eslint-disable @typescript-eslint/no-explicit-any */
import {exec} from '@actions/exec'
import sum from '@naverpay/hidash/sum'
import prettyBytes from 'pretty-bytes'
import * as semver from 'semver'

export interface Diff {
    filename: string
    before: number
    after: number
    delta: number
}

export function getDiff(sizesBefore: Record<string, number>, sizesAfter: Record<string, number>): Diff[] {
    const keys = [...Object.keys(sizesBefore), ...Object.keys(sizesAfter)]
    const fileNames = keys.filter((item, index) => keys.indexOf(item) === index)

    const files = []

    for (const filename of fileNames) {
        const after = sizesAfter[filename] || 0
        const before = sizesBefore[filename] || 0
        const delta = after - before
        files.push({filename, before, after, delta})
    }

    return files
}

export function getPackagesDiff(
    sizesBefore: Record<string, Record<string, number>>,
    sizesAfter: Record<string, Record<string, number>>,
) {
    const packageKeys = [...Object.keys(sizesBefore), ...Object.keys(sizesAfter)]
    const packages = packageKeys.filter((item, index) => packageKeys.indexOf(item) === index)

    const diffs: [string, Diff[]][] = []

    for (const pkg of packages) {
        const pkgDiff = getDiff(sizesBefore?.[pkg] || {}, sizesAfter?.[pkg] || {})
        const totalDiff = sum(pkgDiff.map(({delta}) => delta))
        // 변경 사항이 총 10B 이하면, 무시
        if (Math.abs(totalDiff) < 10) {
            continue
        }
        diffs.push([pkg, pkgDiff])
    }

    return Object.fromEntries(diffs)
}

export function getNextJSDiff(
    sizesBefore: Record<string, Record<string, number>>,
    sizesAfter: Record<string, Record<string, number>>,
) {
    const applicationKeys = [...Object.keys(sizesBefore), ...Object.keys(sizesAfter)]
    const applications = applicationKeys.filter((item, index) => applicationKeys.indexOf(item) === index)

    const diffs: [string, Diff[]][] = []

    for (const application of applications) {
        const applicationDiff = getDiff(sizesBefore?.[application] || {}, sizesAfter?.[application] || {})
        const totalDiff = sum(applicationDiff.map(({delta}) => delta))
        // 변경 사항이 총 10B 이하면, 무시
        if (Math.abs(totalDiff) < 10) {
            continue
        }
        diffs.push([application, applicationDiff])
    }

    return diffs
}

export interface DependencyChange {
    package: string
    type: 'package_added' | 'package_updated' | 'package_downgrade' | 'package_removed'
    previous?: string
    updated?: string
    bundleSizeText: string
    diffText: string
}

async function getPackageUnpackSize(packageName: string, version: string): Promise<number> {
    let output = ''
    let error = ''

    const options = {
        listeners: {
            stdout: (data: Buffer) => (output += data.toString()),
            stderr: (data: Buffer) => (error += data.toString()),
        },
        silent: true,
    }

    try {
        await exec('npm', ['view', `${packageName}@${version}`, '--json'], options)
        if (error) {
            return 0
        }
        const npmPackageInfo = JSON.parse(output)
        const unpackSize = npmPackageInfo?.dist?.unpackedSize || 0
        return unpackSize
    } catch {
        return 0
    }
}

async function getPackageJSONDependenciesDiff(basePackageJSON: any, headPackageJSON: any) {
    const baseDependencies = (basePackageJSON?.dependencies || {}) as Record<string, string>
    const headDependencies = (headPackageJSON?.dependencies || {}) as Record<string, string>

    const diffs: DependencyChange[] = []

    for await (const [pkg, headVersion] of Object.entries(headDependencies)) {
        const baseVersion = baseDependencies[pkg] || ''

        if (headVersion.includes('workspace') || baseVersion.includes('workspace')) {
            continue
        }

        const baseMinVersion = semver.minVersion(baseVersion)
        const headMinVersion = semver.minVersion(headVersion)

        if (!baseVersion && headMinVersion) {
            const size = await getPackageUnpackSize(pkg, headMinVersion.version)
            const addedSize = `\`${prettyBytes(size)}\``
            diffs.push({
                package: pkg,
                type: 'package_added',
                updated: headVersion,
                bundleSizeText: addedSize,
                diffText: addedSize,
            })
            continue
        }

        if (!baseMinVersion || !headMinVersion || semver.eq(baseMinVersion, headMinVersion)) {
            continue
        }
        const changeType = semver.gt(headMinVersion, baseMinVersion)
            ? semver.diff(baseMinVersion, headMinVersion)
            : 'downgrade'

        if (!changeType) {
            continue
        }

        const [basePkgSize, headPkgSize] = await Promise.all([
            getPackageUnpackSize(pkg, baseMinVersion.version),
            getPackageUnpackSize(pkg, headMinVersion.version),
        ])

        const delta = headPkgSize - basePkgSize
        const percentage = Math.round((delta / basePkgSize) * 100)
        const percentageText = basePkgSize === 0 ? '' : ` (${percentage > 0 ? '+' : ''}${percentage}%)`

        diffs.push({
            package: pkg,
            type: changeType === 'downgrade' ? 'package_downgrade' : 'package_updated',
            previous: baseVersion,
            updated: headVersion,
            bundleSizeText: `\`${basePkgSize > 0 ? '+' : ''}${prettyBytes(basePkgSize)}\` → \`${basePkgSize > 0 ? '+' : ''}${prettyBytes(headPkgSize)}\``,
            diffText: `\`${delta > 0 ? '+' : ''}${prettyBytes(Math.round(delta))}${percentageText}\``,
        })
    }

    for (const [pkg, baseVersion] of Object.entries(baseDependencies)) {
        if (!baseVersion.includes('workspace') && !headDependencies?.[pkg]) {
            const baseMinVersion = semver.minVersion(baseVersion)
            if (!baseMinVersion) {
                continue
            }
            const size = await getPackageUnpackSize(pkg, baseMinVersion.version)
            const removedSize = `\`-${prettyBytes(size)}\``
            diffs.push({
                package: pkg,
                type: 'package_removed',
                previous: baseVersion,
                bundleSizeText: removedSize,
                diffText: removedSize,
            })
        }
    }

    return diffs
}

export async function getPackageJSONDiff(basePackageJSONs: Record<string, any>, headPackageJSONs: Record<string, any>) {
    const packageKeys = [...Object.keys(basePackageJSONs), ...Object.keys(headPackageJSONs)]
    const packageNames = packageKeys.filter((item, index) => packageKeys.indexOf(item) === index)

    const diffs: [string, DependencyChange[]][] = []

    for await (const packageName of packageNames) {
        const before = basePackageJSONs?.[packageName] || {}
        const after = headPackageJSONs?.[packageName] || {}
        const diff = await getPackageJSONDependenciesDiff(before, after)
        diffs.push([packageName, diff])
    }

    return Object.fromEntries(diffs)
}
