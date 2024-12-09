import * as fs from 'node:fs'
import * as path from 'node:path'

import {exec} from '@actions/exec'
import sum from '@naverpay/hidash/sum'

import {getGithubToken, getStringInput} from './utils/aciton'
import {
    getFileSize,
    getInstallScript,
    getNextJSPagesInfo,
    getPackageJSONs,
    getPackageFiles,
    isNextJSApplication,
    isPackage,
} from './utils/file'
import {i18nText} from './utils/i18n'

interface AnalyzeParams {
    workingDirectory: string
    gitUrl: string
    branch: string
}

export async function analyze({workingDirectory, gitUrl, branch}: AnalyzeParams) {
    try {
        /**
         * 0. Clean Current Working Directory
         */
        await exec(`rm -rf ${workingDirectory}`).catch(() => {})
        /**
         * 1. Clone Target Branch Repository
         */
        console.log(`Cloning Repository (branch: ${branch})`)
        const githubToken = getGithubToken()
        const url = gitUrl.replace('https://', `https://git:${githubToken}@`)
        await exec(`git clone --depth=1 --single-branch --branch ${branch} ${url} ${workingDirectory}`)

        /**
         * 2. Install Dependencies
         */
        const [packageManager, installScript] = await getInstallScript(workingDirectory)
        const install = `${packageManager} ${installScript}`

        console.log(`Installing using ${install} (branch: ${branch})`)
        await exec(install, undefined, {cwd: workingDirectory})

        /**
         * 3. Build Apps, Packages, etc...
         */
        const buildScript = getStringInput('build_script') || 'build'
        const includePackageManagerInBuildScript = ['npm', 'pnpm', 'yarn'].some((pm) => buildScript.includes(pm))
        if (includePackageManagerInBuildScript) {
            throw new Error(i18nText('include_pm_in_build_script'))
        }
        const build = `${packageManager} run ${buildScript}`

        console.log(`Building using ${build} (branch: ${branch})`)
        await exec(build, undefined, {cwd: workingDirectory})

        /**
         * 4. Calculate Size Of Build Output (automatically detected)
         */
        const packageJSONs = getPackageJSONs(workingDirectory)

        const packageSizes: [string, Record<string, number>][] = []
        const nextJsSizes: [string, Record<string, number>][] = []
        const packageJsons = []

        for await (const [packageJSONPath, packageJSON] of packageJSONs) {
            const name: string = packageJSON?.name || ''

            if (!name) {
                throw new Error(`${i18nText('invalid_package_name')}${packageJSONPath}/package.json)`)
            }

            if (await isNextJSApplication(packageJSONPath, packageJSON)) {
                const pageStaticInfos = await getNextJSPagesInfo(packageJSONPath)
                const sizeOfStaticPages = await Promise.all(
                    Object.entries(pageStaticInfos).map(async ([pageName, files]) => {
                        const fullPathFiles = files.map((file) => path.join(packageJSONPath, '.next', file))
                        const sizes = await Promise.all(fullPathFiles.map(getFileSize))
                        return [pageName, sum(sizes)] as [string, number]
                    }),
                )
                const nextSize = Object.fromEntries(
                    sizeOfStaticPages.filter(([, size]) => size > 0).sort((a, b) => a[0].localeCompare(b[0])),
                )
                nextJsSizes.push([name, nextSize])
                continue
            }

            if (await isPackage(packageJSON)) {
                const packageFiles = getPackageFiles(packageJSONPath, packageJSON)
                const sizeOfFiles = await Promise.all(
                    packageFiles.map(async (fileName) => {
                        const fileSize = await getFileSize(fileName)
                        return [fileName.replace(packageJSONPath, ''), fileSize] as [string, number]
                    }),
                )
                packageJsons.push([name, packageJSON])
                packageSizes.push([name, Object.fromEntries(sizeOfFiles)])
                continue
            }
        }

        /**
         * 5. Clean Temporary Workspace
         */
        console.log(`Delete temporary build results. (working directory: ${workingDirectory})`)
        fs.rmSync(workingDirectory, {recursive: true, force: true})

        return {
            packages: Object.fromEntries(packageSizes),
            next: Object.fromEntries(nextJsSizes),
            packageJSONs: Object.fromEntries(packageJsons),
        }
    } catch (error) {
        /**
         * 5. Clean Temporary Workspace When Error Occurred
         */
        console.log(`Delete temporary build results. (working directory: ${workingDirectory})`)
        fs.rmSync(workingDirectory, {recursive: true, force: true})

        throw error
    }
}
