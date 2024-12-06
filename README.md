# NaverPay Size Action

> [한글 README 보기](./README.ko.md)

`NaverPay Size Action` is a GitHub Action designed to analyze and compare the differences in build sizes and package sizes between branches in pull requests. This tool is useful for monitoring the impact of code changes on build sizes and providing detailed markdown reports as comments in pull requests.

---

## Features

- **Language Support**: Supports English (`en`) and Korean (`ko`).
- **Pull Request Analysis**: Runs only when triggered by a pull request.
- **Comparison of Build Sizes**: Analyzes the differences in build sizes for Next.js applications.
- **Package Size Analysis**: Compares dependencies and outputs markdown reports.
- **Compression Options**: Supports `gzip` (default), `brotli`, or `none` for file size comparison.
- **Customizable Options**: Configurable thresholds, collapse, and omit options for unchanged content.
- **File Ignoring**: Allows the exclusion of specific files or patterns from the analysis.

---

### Inputs

| Input Name              | Description                                                                 | Default Value |
|-------------------------|-----------------------------------------------------------------------------|---------------|
| `github_token`          | GitHub token for authentication (use the user's PAT if necessary).          | Required      |
| `build_script`          | The npm script to run for building your project.                            | `build`       |
| `compression`           | Compression method for file size comparison (`gzip`, `brotli`, or `none`).  | `gzip`        |
| `show_total`            | Show total size and difference in markdown.                                 | `true`        |
| `collapse_unchanged`    | Collapse unchanged files in the markdown output.                            | `true`        |
| `omit_unchanged`        | Exclude unchanged files from the markdown report entirely.                  | `false`       |
| `minimum_change_threshold` | Consider files with changes below this threshold as unchanged (bytes). | `10` for packages, `1000` for Next.js |
| `ignore_patterns`       | File glob patterns to exclude specific files or changes from the analysis.  | None          |
| `language`              | Language for comment detection (`en` or `ko`).                              | `en`          |
| `cwd`                   | Custom working directory for action execution, relative to the repo root.   | `.`           |

---

### Setup

1. Add this action to your GitHub repository's workflow file (e.g., `.github/workflows/size-check.yml`).

2. Example workflow file:

   ```yaml
   name: Analyze Pull Request Size

   on:
     pull_request:
       branches:
         - main

   jobs:
     size-check:
       runs-on: ubuntu-latest
       steps:
         - name: Run Size Action
           uses: naverpay/size-action@v1
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             build_script: build
             compression: gzip
             language: 'en'
             cwd: './'
             show_total: true
             collapse_unchanged: true
             omit_unchanged: false
             minimum_change_threshold: 1000
             ignore_patterns: '**/playground/**'
   ```

---

### Outputs

- Detailed markdown reports summarizing:
  - Changes in Next.js application build sizes.
  - Package dependency size differences.

---

### Error Handling

- Invalid configurations or unsupported languages will result in a failure with a detailed error message.
- If no pull request context is detected, the action will terminate with an error.

---

### License

This action is licensed under the [MIT License](./LICENSE).
