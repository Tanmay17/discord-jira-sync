"""Back up local Postgres and verify a restore in a new disposable database.
The backup contains private messages; it stays under ignored .local/backups.
No bot process ever uses the temporary database.
"""
from datetime import datetime, timezone
from pathlib import Path
import json
import subprocess

prefix = ['docker','compose','exec','-T','db']
name = 'sync_restore_check_' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
folder = Path('.local/backups')
folder.mkdir(parents=True, exist_ok=True)
folder.chmod(0o700)
backup = folder / (name + '.dump')
with backup.open('wb') as output:
    result = subprocess.run(prefix + ['pg_dump','-U','sync','-d','sync','-Fc'], stdout=output, stderr=subprocess.PIPE)
backup.chmod(0o600)
if result.returncode:
    raise SystemExit('Backup failed; inspect local Docker/Postgres without sharing credentials.')
created = subprocess.run(prefix + ['createdb','-U','sync',name], capture_output=True)
if created.returncode:
    raise SystemExit('Temporary restore database could not be created.')
try:
    with backup.open('rb') as source:
        restored = subprocess.run(prefix + ['pg_restore','-U','sync','--no-owner','-d',name], stdin=source, capture_output=True)
    if restored.returncode:
        raise SystemExit('Restore failed; backup retained locally for inspection.')
    query = 'SELECT json_build_object(\'events\',(SELECT count(*) FROM events),\'mutations\',(SELECT count(*) FROM mutations),\'threads\',(SELECT count(*) FROM threads));'
    def counts(database):
        result = subprocess.run(prefix + ['psql','-U','sync','-d',database,'-tAc',query], capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    original, copy = counts('sync'), counts(name)
    print(json.dumps({'backup':str(backup),'restoredCounts':copy,'sourceCounts':original,'countsMatch':original == copy}))
    if original != copy:
        raise SystemExit('Counts changed during backup or restore: rerun while the bot is quiescent.')
finally:
    subprocess.run(prefix + ['dropdb','-U','sync',name], capture_output=True, check=True)
