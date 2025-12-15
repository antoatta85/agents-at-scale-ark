# Goal

Collaborate interactively with the user on open source repository maintenance tasks for the Ark project.

## Workflow

1. User describes a repository maintenance task (CI/CD issue, PR management, release, etc.)
2. Use GitHub MCP tools to gather context about the issue
3. LOOP:
   - Present findings and options to the user
   - Ask clarifying questions
   - Research further if needed
   - Propose solutions or actions
   - ONLY execute actions when user explicitly approves
   - Start again

**IMPORTANT**: Always explain what you're about to do before doing it. Never push code or create releases without explicit approval.

## Task Categories

### CI/CD Debugging

**Workflows to know:**
- `cicd.yaml` - Main CI/CD pipeline (builds, tests, e2e, releases)
- `deploy.yml` - Manual deployment workflow (containers, helm, npm, pypi)
- `validate_pr_title.yml` - PR title validation for conventional commits
- `terraform_*.yml` - Infrastructure deployment workflows

**Custom actions in `.github/actions/`:**
- `build-image` - Docker image building
- `setup-e2e` - E2E test environment setup
- `setup-k3s` - K3s cluster provisioning
- `collect-coverage` / `collect-coverage-e2e` - Coverage reporting
- `jfrog-xray-scan` - Security scanning
- `deploy-ark-helmchart` - Helm deployment
- `resolve-version` - Version resolution for releases
- `test-ark-cli` - CLI integration tests

**Debugging with GitHub MCP:**
1. List workflow runs: `list_commits` to find recent activity, then check PR status
2. Get PR details and checks: `pull_request_read` with method `get_status`
3. View workflow files: `get_file_contents` for `.github/workflows/*.yaml`
4. Check action definitions: `get_file_contents` for `.github/actions/*/action.yaml`

### PR Management

**PR title format (required):**
```
<type>: <description>

Types: feat, fix, docs, chore, refactor, test, ci, build, perf
```

**CODEOWNERS:**
- Root changes: @dwmkerr @cm94242 @Nab-0 @CeliaPrieto @david-gombos
- CRDs (`/ark/config/crd/`, `/ark/api/`): Same as root
- Dashboard (`/services/ark-dashboard/`): @av3n93rz + root owners

**PR operations with GitHub MCP:**
- List PRs: `list_pull_requests` with state filter
- Get PR details: `pull_request_read` with method `get`
- Get PR diff: `pull_request_read` with method `get_diff`
- Get PR status/checks: `pull_request_read` with method `get_status`
- Get PR files: `pull_request_read` with method `get_files`
- Get PR reviews: `pull_request_read` with method `get_reviews`
- Update PR: `update_pull_request` to change title, description, reviewers
- Search PRs by author: `search_pull_requests`

**When reviewing PRs:**
- Check conventional commit format in title
- Verify CI status with `get_status`
- Review changed files with `get_files`
- Check for security scan results (JFrog Xray)

### Release Management

**Release process (automated via Release Please):**
1. PRs merged to `main` trigger `release-please-action`
2. Release PR is created/updated with changelog
3. On release PR merge:
   - Tag is created
   - `deploy.yml` is triggered with release artifacts
   - Containers pushed to GHCR
   - Helm charts published
   - NPM package published
   - Python packages published to PyPI
   - Docs deployed to GitHub Pages

**Version files updated by release-please:**
- `version.txt` (root and ark/)
- Chart.yaml files (multiple services)
- package.json files (ark-cli, docs, ark-cluster-memory)
- pyproject.toml files (Python services and SDK)

**Release operations with GitHub MCP:**
- List releases: `list_releases`
- Get latest release: `get_latest_release`
- Get release by tag: `get_release_by_tag`
- List tags: `list_tags`
- Get tag details: `get_tag`

### Issue Triage

**Labels to consider:**
- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Docs improvements
- `good first issue` - Good for newcomers

**Issue operations with GitHub MCP:**
- List issues: `list_issues` with state and label filters
- Search issues: `search_issues` for complex queries
- Get issue details: `issue_read` with method `get`
- Get issue comments: `issue_read` with method `get_comments`
- Create issue: `issue_write` with method `create`
- Update issue: `issue_write` with method `update`
- Add comment: `add_issue_comment`

**Before creating issues:**
- Use `search_issues` to check for existing issues
- Gather reproduction steps
- Check if it's a known limitation

### Dependabot and Security

**Security scanning:**
- JFrog Xray scans on every CI run
- Tolerated violations in `.github/actions/jfrog-xray-scan/tolerated_violations.txt`
- New violations fail CI unless whitelisted

**Dependabot config:** `.github/dependabot.yaml`

## Key Repository Info

**Repository:** `mckinsey/agents-at-scale-ark`

**Container registry:** `ghcr.io/mckinsey/agents-at-scale-ark`

**Published artifacts:**
- Helm charts: OCI registry at `ghcr.io/mckinsey/agents-at-scale-ark/charts`
- NPM: `@agents-at-scale/ark` (ark-cli)
- PyPI: `ark-sdk`

**E2E test framework:** Chainsaw (Kyverno)
- Config: `tests/.chainsaw.yaml`, `tests/.chainsaw-evaluated.yaml`
- Standard tests: `chainsaw test --selector '!evaluated'`
- Evaluated tests: `chainsaw test --selector 'evaluated=true'`

## GitHub MCP Quick Reference

```
# Repository content
get_file_contents(owner, repo, path)
list_branches(owner, repo)
list_commits(owner, repo, sha?)

# Pull requests
list_pull_requests(owner, repo, state?)
pull_request_read(method, owner, repo, pullNumber)
  methods: get, get_diff, get_status, get_files, get_reviews, get_comments
update_pull_request(owner, repo, pullNumber, title?, body?, reviewers?)
search_pull_requests(query, owner?, repo?)

# Issues
list_issues(owner, repo, state?, labels?)
issue_read(method, owner, repo, issue_number)
  methods: get, get_comments, get_labels
issue_write(method, owner, repo, title?, body?, labels?)
  methods: create, update
search_issues(query, owner?, repo?)
add_issue_comment(owner, repo, issue_number, body)

# Releases
list_releases(owner, repo)
get_latest_release(owner, repo)
get_release_by_tag(owner, repo, tag)
list_tags(owner, repo)
```

## Guidelines

- Always use GitHub MCP tools to fetch current state before making suggestions
- Explain the impact of proposed changes
- For CI failures, read workflow files with `get_file_contents` to understand the pipeline
- When debugging container builds, check the `prebuild` steps in workflow matrix
- Cross-reference release-please config when version issues occur
- Propose minimal changes that solve the problem
