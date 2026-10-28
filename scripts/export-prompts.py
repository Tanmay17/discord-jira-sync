"""Export visible messages and tool activity from one explicitly selected Codex session.
Hidden reasoning and system/developer instructions are deliberately excluded.
Usage: python3 scripts/export-prompts.py /absolute/path/to/session.jsonl
"""
import json
import pathlib
import re
import sys

source = pathlib.Path(sys.argv[1]).resolve()
target = pathlib.Path('prompts/2026-10-28-codex.jsonl')
records = []
for line in source.read_text().splitlines():
    record = json.loads(line)
    if record.get('type') != 'response_item':
        continue
    payload = record.get('payload', {})
    kind = payload.get('type')
    if kind == 'message':
        if payload.get('role') not in ('user', 'assistant'):
            continue
        if payload.get('channel') == 'analysis':
            continue
    elif kind not in ('function_call', 'function_call_output', 'custom_tool_call', 'custom_tool_call_output'):
        continue
    records.append({'timestamp': record.get('timestamp'), 'payload': payload})
text = '\n'.join(json.dumps(record, ensure_ascii=False) for record in records) + '\n'
# Known token formats; manually review exports for other credentials before committing.
text = re.sub(r'(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})', '[REDACTED_TOKEN]', text)
target.write_text(text)
print(f'Exported {len(records)} records to {target}; review for secrets before committing.')
