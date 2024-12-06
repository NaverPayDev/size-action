/* eslint-disable @typescript-eslint/naming-convention */
import * as i18next from 'i18next'

const resources = {
    en: {
        translation: {
            not_pull_request_action:
                'The NaverPay size action only operates on the pull_request event. Please check the action trigger conditions.',
            no_github_token:
                'The required github_token for the action was not provided. Please check the action YAML configuration.',
            closed_pull_request: 'The pull request is already closed. Terminating this action.',
            non_mergeable: 'The pull request is not mergeable. Terminating this action.',
            already_merged: 'The pull request has already been merged. Terminating this action.',
            include_pm_in_build_script:
                'The `build_script` provided to the action includes values such as `npm`, `pnpm`, or `yarn`. Please remove these.',
            invalid_compression_type:
                'Unknown compression type provided. Only `none`, `gzip`, or `brotli` are allowed. Please check the action YAML configuration.',
            invalid_package_name: "The 'name' field is missing in the package.json file. (file location: ",
            empty_title: '### 🔍 No files have been changed',
            empty_latest_commit: 'Latest commit:',
            empty_check_commit: 'Please check your commit.',
            package_file: 'File',
            page_route: '🪧 Page Routes',
            diff_status: 'Status',
            before_size: 'Previous Size',
            after_size: 'Updated Size',
            size_changed: 'Changed',
            view_unchanged_package: 'View Unchanged Packages',
            view_unchanged_next: 'View Unchanged Page Routes',
            total_size: 'Total Sizes',
            total_change: 'Total Changes',
            status_added: 'Added',
            status_removed: 'Removed',
            status_modified: 'Modified',
            dependency_package: 'Package',
            previous_version: 'Previous Version',
            updated_version: 'Updated Version',
            bundle_size: 'Bundle Size (Max)',
            package_added: 'Added',
            package_updated: 'Updated',
            package_downgrade: 'Downgraded',
            package_removed: 'Removed',
            readme: 'README.md',
            internal_server_error: 'An unknown error occurred. If this persists, please report it.',
        },
    },
    ko: {
        translation: {
            not_pull_request_action:
                'naverpay size action은 pull_request event에서만 동작합니다. action trigger 조건을 확인해주세요.',
            no_github_token: 'action 실행에 필요한 github_token이 주입되지 않았습니다. action yaml을 확인해주세요.',
            closed_pull_request: '이미 closed된 pull request 입니다. 해당 action을 종료합니다.',
            non_mergeable: 'merge 할 수 없는 pull request입니다. 해당 action을 종료합니다.',
            already_merged: '이미 merge된 pull request입니다. 해당 action을 종료합니다.',
            include_pm_in_build_script:
                'action에 주입한 `build_script`에 `npm`, `pnpm`, `yarn` 등의 값이 포함되어 있습니다. 이를 제거해주세요.',
            invalid_compression_type:
                '알 수 없는 compression type 입니다. compression에는 `none`, `gzip`, `brotli`만 사용가능합니다. action yaml을 확인해주세요.',
            invalid_package_name: 'package.json에 name 필드가 누락되어 있습니다. (파일 위치: ',
            empty_title: '### 🔍 크기가 변경된 파일이 없습니다.',
            empty_latest_commit: '마지막 commit:',
            empty_check_commit: 'commit을 확인해주세요.',
            package_file: '파일',
            page_route: '🪧 페이지 경로',
            diff_status: '상태',
            before_size: '이전 크기',
            after_size: '변경 후 크기',
            size_changed: '증감',
            view_unchanged_package: '변경되지 않은 패키지 보기',
            view_unchanged_next: '변경되지 않은 페이지 경로 보기',
            total_size: '전체 파일 사이즈',
            total_change: '변경된 파일 사이즈',
            status_added: '추가됨',
            status_removed: '삭제됨',
            status_modified: '수정됨',
            dependency_package: '패키지',
            previous_version: '이전 버전',
            updated_version: '변경된 버전',
            bundle_size: '번들 크기 (최대)',
            package_added: '추가됨',
            package_updated: '업데이트됨',
            package_downgrade: '다운그레이드됨',
            package_removed: '삭제됨',
            readme: 'README.ko.md',
            internal_server_error: '알 수 없는 오류가 발생했습니다. 계속 발생된다면, 제보 부탁드립니다.',
        },
    },
}

export async function initI18n(language: string) {
    await i18next.init({lng: language, fallbackLng: 'en', resources})
}

export function i18nText(key: string) {
    return i18next.t(key)
}
