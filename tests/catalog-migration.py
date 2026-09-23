import sqlite3
from pathlib import Path
sql=(Path(__file__).resolve().parents[1]/'db/migrate-agentsam-catalog.sql').read_text()
c=sqlite3.connect(':memory:'); c.execute('PRAGMA foreign_keys=ON'); c.executescript(sql)
c.execute("INSERT INTO code_repositories(id,account_id,provider,name,repo_full_name) VALUES('resolved-test','owner','github','test','owner/test')")
c.execute("INSERT INTO agentsam_products(slug,name,kind,repository_id,source_type,source_id) VALUES('theme','Theme','theme','resolved-test','created_asset','source')")
assert c.execute('SELECT count(*) FROM asset_relationships').fetchone()[0]==2
assert c.execute("SELECT count(*) FROM agentsam_products_fts WHERE agentsam_products_fts MATCH 'Theme'").fetchone()[0]==1
c.execute("UPDATE agentsam_products SET name='Heuristic',repository_id=NULL WHERE slug='theme'")
assert c.execute("SELECT count(*) FROM asset_relationships WHERE relationship_type='defined_in'").fetchone()[0]==0
assert c.execute("SELECT count(*) FROM agentsam_products_fts WHERE agentsam_products_fts MATCH 'Heuristic'").fetchone()[0]==1
for values in [('bad','Bad','product','completeful_product','123'),('pair','Pair','collection','created_asset',None)]:
 try:c.execute('INSERT INTO agentsam_products(slug,name,kind,source_type,source_id) VALUES(?,?,?,?,?)',values)
 except sqlite3.IntegrityError:pass
 else:raise AssertionError('Invalid row accepted')
c.commit(); c.executescript(sql)
assert c.execute('SELECT count(*) FROM agentsam_products').fetchone()[0]==1
assert not c.execute('PRAGMA foreign_key_check').fetchall()
c.execute("DELETE FROM agentsam_products WHERE slug='theme'")
assert c.execute('SELECT count(*) FROM asset_relationships').fetchone()[0]==0
print('Fresh install, row-preserving rerun, FTS, relationship lifecycle, provenance rejection and FK checks passed')
