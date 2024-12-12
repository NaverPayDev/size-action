/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'node:fs'
import * as path from 'node:path'

import * as brotli from 'brotli-size'
import * as glob from 'glob'
import * as gzip from 'gzip-size'

import {getStringInput} from './aciton'
import {i18nText} from './i18n'

async function fileExists(filename: string) {
    try {
        await fs.promises.access(filename, fs.constants.F_OK)
        return true
    } catch {
        return false
    }
}

export async function getInstallScript(workingDirectory: string) {
    const [packageLock, yarnLock, pnpmLock] = await Promise.all(
        ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].map((file) =>
            fileExists(path.resolve(workingDirectory, file)),
        ),
    )
    switch (true) {
        case pnpmLock:
            return ['pnpm', 'install --frozen-lockfile']
        case yarnLock:
            return ['yarn', '--frozen-lockfile']
        case packageLock:
            return ['npm', 'ci']
        default:
            return ['npm', 'install']
    }
}

async function gzipSize(filePath: string): Promise<number> {
    return gzip.gzipSizeFromFile(filePath)
}

async function brotliSize(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath)
        stream.on('error', reject)
        const brotliStream = stream.pipe(brotli.stream())
        brotliStream.on('error', reject)
        brotliStream.on('brotli-size', resolve)
    })
}

async function noneSize(filePath: string): Promise<number> {
    const stat = await fs.promises.stat(filePath)
    return stat.size
}

export async function getFileSize(filePath: string) {
    const compressType = getStringInput('compression') || 'gzip'
    if (!['none', 'gzip', 'brotli'].includes(compressType)) {
        throw new Error(i18nText('invalid_compression_type'))
    }
    switch (compressType) {
        case 'none':
            return noneSize(filePath)
        case 'brotli':
            return brotliSize(filePath)
        default:
            return gzipSize(filePath)
    }
}

export function getPackageJSONs(workingDirectory: string): [string, any][] {
    return glob.globSync('**/package.json', {cwd: workingDirectory}).map((filePath) => {
        const jsonPath = path.join(workingDirectory, filePath)
        const packagePath = jsonPath.replace(/\/package.json$/, '')
        const content = JSON.parse(fs.readFileSync(jsonPath, {encoding: 'utf-8'}))
        return [packagePath, content]
    })
}

export async function isNextJSApplication(packageJSONPath: string, packageJSON: any) {
    const dependencies = [
        ...Object.entries(packageJSON?.dependencies || {}),
        ...Object.entries(packageJSON?.devDependencies || {}),
    ] as [string, string][]

    const hasNextPackages = dependencies.find(([packageName]) => packageName === 'next')
    if (!hasNextPackages) {
        return false
    }

    const appBuildManifestPath = path.join(packageJSONPath, '.next/app-build-manifest.json')
    if (await fileExists(appBuildManifestPath)) {
        return true
    }

    const legacyBuildManifestPath = path.join(packageJSONPath, '.next/build-manifest.json')
    if (await fileExists(legacyBuildManifestPath)) {
        return true
    }

    return false
}

export async function getNextJSPagesInfo(packageJSONPath: string) {
    let pages: Record<string, string[]> = {}
    const appBuildManifestPath = path.join(packageJSONPath, '.next/app-build-manifest.json')
    if (await fileExists(appBuildManifestPath)) {
        const appBuildManifestJson = JSON.parse(fs.readFileSync(appBuildManifestPath, {encoding: 'utf-8'}))
        pages = {...pages, ...(appBuildManifestJson?.pages || {})}
    }
    const legacyBuildManifestPath = path.join(packageJSONPath, '.next/build-manifest.json')
    if (await fileExists(legacyBuildManifestPath)) {
        const legacyBuildManifestJson = JSON.parse(fs.readFileSync(legacyBuildManifestPath, {encoding: 'utf-8'}))
        pages = {...pages, ...(legacyBuildManifestJson?.pages || {})}
    }
    return pages
}

export async function isPackage(packageJSON: any) {
    const files = packageJSON?.files || []
    if (files.length > 0) {
        return true
    }

    if (packageJSON?.main || packageJSON?.publishConfig) {
        return true
    }

    return false
}

export function getPackageFiles(packageJSONPath: string, packageJSON: any) {
    const files = (packageJSON?.files || []) as string[]
    return files
        .map((file) => {
            const pattern = file.includes('.')
                ? path.join(packageJSONPath, '**', '*', file)
                : path.join(packageJSONPath, file, '**', '*')
            return glob
                .globSync(pattern, {nodir: true})
                .filter((fileName) => ['.js', '.cjs', '.mjs', '.png'].some((extension) => fileName.endsWith(extension)))
        })
        .flat()
}
