import sqlite3
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sql=(root/'db/migrate-agentsam-catalog.sql').read_text()
import json
manifest=json.loads((root/'catalog-products.agentsam-sdk.json').read_text())
assert 'agentsam_products' in manifest and 'products' not in manifest
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

# FNF component/package seed resolves repository ownership dynamically and is rerunnable.
seed=(root/'db/seed-agentsam-products-fnf-components.sql').read_text()
d=sqlite3.connect(':memory:'); d.execute('PRAGMA foreign_keys=ON'); d.executescript(sql)
d.execute(
 "INSERT INTO code_repositories(id,account_id,provider,name,repo_full_name) VALUES(?,?,?,?,?)",
 ('resolved-fnf','account-test','github','fuelnfreetime','SamPrimeaux/fuelnfreetime')
)
d.executescript(seed)
expected={
 'ecommerce-cms-agentsam','commerce-admin-nav','mini-agentsam','theme-studio',
 'agentsam-workbench','commerce-email','heuristic','commerce-analytics'
}
rows=d.execute(
 "SELECT slug,repository_id FROM agentsam_products WHERE slug IN ({})".format(
   ','.join('?' for _ in expected)
 ), tuple(expected)
).fetchall()
assert {slug for slug,_ in rows}==expected
assert all(repo_id=='resolved-fnf' for _,repo_id in rows)
app_id=d.execute("SELECT id FROM agentsam_products WHERE slug='ecommerce-cms-agentsam'").fetchone()[0]
consumed=d.execute(
 "SELECT count(*) FROM asset_relationships WHERE target_type='agentsam_product' AND target_id=? AND relationship_type='consumed_by'",
 (app_id,)
).fetchone()[0]
assert consumed==7
before=d.execute("SELECT count(*) FROM agentsam_products").fetchone()[0]
d.executescript(seed)
assert d.execute("SELECT count(*) FROM agentsam_products").fetchone()[0]==before
