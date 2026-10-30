"""Read this repository's GitHub status using its existing Git credential helper.
Never prints credentials or workflow logs. No remote mutations.
"""
import json
import subprocess
import urllib.request
import urllib.error
import ssl
import certifi

credential = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True, timeout=30)
fields = dict(line.split('=', 1) for line in credential.stdout.splitlines() if '=' in line)
token = fields.get('password')
if not token:
    raise SystemExit('GitHub API authentication unavailable; sign in is required.')
base = 'https://api.github.com/repos/Tanmay17/discord-jira-sync'
for suffix in ['', '/actions/runs?per_page=6', '/actions/secrets', '/branches/main/protection', '/collaborators?affiliation=direct']:
    request = urllib.request.Request(base + suffix, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'})
    try:
        with urllib.request.urlopen(request, timeout=20, context=ssl.create_default_context(cafile=certifi.where())) as response:
            body = json.load(response)
        if not suffix:
            result = {key: body.get(key) for key in ['private', 'fork', 'default_branch', 'visibility']}
        elif suffix.startswith('/actions/runs'):
            result = [{'name': run['name'], 'status': run['status'], 'conclusion': run['conclusion'], 'url': run['html_url'], 'sha': run['head_sha'][:7], 'id': run['id']} for run in body['workflow_runs']]
        elif suffix == '/actions/secrets':
            result = {'secret_names': [secret['name'] for secret in body['secrets']]}
        elif suffix.startswith('/collaborators'):
            result = {'collaborators': [user['login'] for user in body]}
        else:
            result = {'required_status_checks': body.get('required_status_checks'), 'required_pull_request_reviews': body.get('required_pull_request_reviews')}
        print(json.dumps({'endpoint': suffix or '/', 'result': result}))
    except urllib.error.HTTPError as error:
        print(json.dumps({'endpoint': suffix or '/', 'status': error.code}))
