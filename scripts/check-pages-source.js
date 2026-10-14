'use strict';

async function checkPagesSource({ repository, token, apiUrl = 'https://api.github.com', request = fetch }) {
  if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GH_TOKEN are required to check the Pages source.');
  const options = {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15000),
  };
  const repositoryUrl = `${apiUrl}/repos/${repository}`;
  const response = await request(`${repositoryUrl}/pages`, options);
  if (!response.ok) throw new Error(`Cannot read GitHub Pages configuration (HTTP ${response.status}). Check Pages is enabled and the token has pages: read permission.`);
  const pages = await response.json();
  if (pages.build_type !== 'workflow') {
    throw new Error('GitHub Pages still publishes from a branch. Select Settings > Pages > Build and deployment > Source > GitHub Actions, then wait for any legacy "pages build and deployment" run to finish before deploying. The app entry point is public/index.html; publishing the repository root renders README.md.');
  }
  // Switching the source does not cancel a Jekyll run already queued by a push.
  // Check all dynamic runs so an older deployment cannot overwrite this artifact.
  for (let page = 1; ; page++) {
    const runsResponse = await request(`${repositoryUrl}/actions/runs?event=dynamic&per_page=100&page=${page}`, options);
    if (!runsResponse.ok) throw new Error(`Cannot check legacy Pages runs (HTTP ${runsResponse.status}). The token needs actions: read permission.`);
    const { workflow_runs: runs } = await runsResponse.json();
    if (!Array.isArray(runs)) throw new Error('Invalid GitHub Actions response: workflow_runs is missing.');
    const active = runs.find(run => run.path === 'dynamic/pages/pages-build-deployment' && run.status !== 'completed');
    if (active) throw new Error(`Legacy Pages run ${active.id} is still ${active.status}. Wait for it to finish or cancel it, then rerun this workflow to publish public/ safely.`);
    if (runs.length < 100) break;
  }
  return pages;
}

if (require.main === module) {
  checkPagesSource({ repository: process.env.GITHUB_REPOSITORY, token: process.env.GH_TOKEN, apiUrl: process.env.GITHUB_API_URL })
    .then(() => console.log('GitHub Pages source: GitHub Actions. Only the public/ artifact will be deployed.'))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { checkPagesSource };
