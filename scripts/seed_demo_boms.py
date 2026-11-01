"""
Demo BOM generator for Bharat Impex.

Creates realistic demo child parts (with opening stock) and an active BOM for every finished
good that has none, choosing the recipe from the product name. Works through the app's own API,
so it can target localhost or the live site. Safe to re-run: existing parts and BOMs are skipped.

Usage:
  python scripts/seed_demo_boms.py --base "http://localhost/bharat%20impex%20stock%20project" --user admin --password <pw>
  python scripts/seed_demo_boms.py --base https://bharat.solveall360.com --user admin --password <pw> [--dry-run]
"""
import argparse, json, sys, urllib.request, urllib.error

# name, unit, standard rate (INR)
PARTS = {
    'body_mixer':  ('Brass Body Casting - Mixer', 'PCS', 320),
    'body_pillar': ('Brass Body Casting - Pillar / Bib Cock', 'PCS', 180),
    'body_angle':  ('Brass Body Casting - Angle Cock', 'PCS', 150),
    'cartridge':   ('Ceramic Disc Cartridge 35MM', 'PCS', 85),
    'spindle':     ('Quarter-Turn Spindle 1/2"', 'PCS', 60),
    'handle':      ('Zinc Die-Cast Handle Lever', 'PCS', 45),
    'aerator':     ('Brass Aerator M24 Neoperl Type', 'PCS', 28),
    'oring':       ('EPDM O-Ring 22MM ID', 'PCS', 2.5),
    'screw':       ('SS 304 Screw M4x10', 'PCS', 1.5),
    'flange':      ('Wall Flange CP', 'PCS', 25),
    'hose':        ('Connection Hose 18" SS Braided', 'PCS', 70),
    'shower_arm':  ('Shower Arm Brass 12"', 'PCS', 140),
    'shower_face': ('Shower Face Plate', 'PCS', 90),
    'nozzle':      ('Shower Rubber Nozzle Set', 'SET', 30),
    'abs_body':    ('ABS Body Moulding', 'PCS', 40),
    'bracket':     ('ABS Wall Bracket', 'PCS', 15),
    'rawl':        ('Rawl Plug & Screw Set', 'SET', 6),
    'trap_body':   ('Bottle Trap Body Brass', 'PCS', 210),
    'waste_pipe':  ('Trap Waste Pipe 12"', 'PCS', 55),
    'ss_pipe':     ('SS Pipe 18"', 'PCS', 120),
    'box':         ('Duplex Printed Product Box A1', 'PCS', 18),
    'polybag':     ('Polybag Packing', 'PCS', 2),
}

# (keywords any-of, label, [(part, qty), ...]) — first match wins
RECIPES = [
    (['mixer', 'basin', 'sink', 'wall mixer'], 'Mixer', [('body_mixer', 1), ('cartridge', 1), ('handle', 1), ('aerator', 1), ('hose', 2), ('oring', 4), ('screw', 2), ('box', 1)]),
    (['shower', 'body jet'], 'Shower', [('shower_face', 1), ('nozzle', 1), ('shower_arm', 1), ('flange', 1), ('oring', 2), ('box', 1)]),
    (['bottle trap'], 'Bottle Trap', [('trap_body', 1), ('waste_pipe', 1), ('oring', 2), ('flange', 1), ('box', 1)]),
    (['pipe'], 'Pipe', [('ss_pipe', 1), ('oring', 2), ('polybag', 1)]),
    (['chair'], 'Bathroom Chair', [('abs_body', 1), ('bracket', 2), ('rawl', 2), ('screw', 4), ('box', 1)]),
    (['soap dish', 'towel', 'bath set', 'rod', 'ring', 'holder', 'shelf', 'tumbler'], 'Accessory', [('abs_body', 1), ('bracket', 2), ('rawl', 1), ('polybag', 1), ('box', 1)]),
    (['abs'], 'ABS Tap', [('abs_body', 1), ('spindle', 1), ('handle', 1), ('oring', 2), ('polybag', 1), ('box', 1)]),
    (['angle', 'valve', 'stop cock'], 'Angle Cock', [('body_angle', 1), ('spindle', 1), ('handle', 1), ('flange', 1), ('oring', 2), ('box', 1)]),
    (['pillar', 'bib', 'cock', 'tap', 'faucet', 'long body', 'sink cock'], 'Pillar / Bib Cock', [('body_pillar', 1), ('spindle', 1), ('handle', 1), ('aerator', 1), ('oring', 2), ('screw', 1), ('box', 1)]),
]
FALLBACK = ('General', [('body_angle', 1), ('handle', 1), ('oring', 2), ('box', 1)])
OPENING_QTY = 1000


class Api:
    def __init__(self, base, token=None):
        self.base = base.rstrip('/') + '/api'
        self.token = token

    def call(self, path, body=None):
        req = urllib.request.Request(self.base + path, data=json.dumps(body).encode() if body is not None else None,
                                     method='POST' if body is not None else 'GET')
        req.add_header('Content-Type', 'application/json')
        req.add_header('Accept', 'application/json')
        # Cloudflare in front of the live site rejects Python's default client signature
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BharatImpexSeeder/1.0')
        if self.token:
            req.add_header('Authorization', 'Bearer ' + self.token)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')
            raise SystemExit(f'API {path} failed ({e.code}): {msg[:300]}')


def recipe_for(name):
    n = name.lower()
    for keys, label, parts in RECIPES:
        if any(k in n for k in keys):
            return label, parts
    return FALLBACK


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--user', required=True)
    ap.add_argument('--password', required=True)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    api = Api(a.base)
    api.token = api.call('/auth/login', {'username': a.user, 'password': a.password})['data']['token']

    bundle = api.call('/settings/bundle')['data']
    units = {u['unit_code'].upper(): int(u['id']) for u in bundle['units']}
    warehouses = bundle.get('warehouses') or []
    wh_id = int(warehouses[0]['id']) if warehouses else None

    rms = api.call('/raw-materials')['data']
    by_name = {r['material_name'].strip().lower(): r for r in rms}
    fgs = [f for f in api.call('/finished-goods')['data'] if str(f.get('active', 1)) == '1']
    boms = api.call('/bom')['data']
    has_bom = {int(b['fg_id']) for b in boms if str(b.get('status')) == 'ACTIVE' or str(b.get('is_active')) == '1'}

    todo = [f for f in fgs if int(f['id']) not in has_bom]
    print(f'Finished goods: {len(fgs)} | with active BOM: {len(fgs) - len(todo)} | BOMs to create: {len(todo)}')

    needed = sorted({p for f in todo for p, _ in recipe_for(f['product_name'])[1]})
    part_ids = {}
    created_parts = []
    for key in needed:
        name, unit, rate = PARTS[key]
        hit = by_name.get(name.lower())
        if hit:
            part_ids[key] = (int(hit['id']), int(hit['unit_id']))
            continue
        uid = units.get(unit, units.get('PCS'))
        if a.dry_run:
            part_ids[key] = (0, uid)
            created_parts.append(name)
            continue
        res = api.call('/raw-materials', {'material_name': name, 'unit_id': uid, 'standard_rate': rate,
                                          'minimum_stock': 100, 'reorder_level': 200, 'maximum_stock': 3000,
                                          'description': 'Demo child part for BOM testing'})['data']
        part_ids[key] = (int(res['id']), uid)
        created_parts.append(name)
        if wh_id:
            api.call('/stock/opening', {'material_type': 'RM', 'material_id': res['id'], 'material_code': res['rm_code'],
                                        'material_name': name, 'warehouse_id': wh_id, 'quantity': OPENING_QTY,
                                        'unit_id': uid, 'rate': rate, 'remarks': 'Demo opening stock for BOM testing'})
    print(f'Child parts created: {len(created_parts)}' + (f' (opening stock {OPENING_QTY} each in {warehouses[0]["warehouse_name"]})' if created_parts and wh_id else ''))
    for n in created_parts:
        print('  +', n)

    for f in todo:
        label, parts = recipe_for(f['product_name'])
        items = [{'rm_id': part_ids[k][0], 'quantity_per_unit': q, 'unit_id': part_ids[k][1], 'sequence': i + 1,
                  'wastage_percentage': 1 if k.startswith('body') else 0, 'mandatory': 1} for i, (k, q) in enumerate(parts)]
        line = f"  {f['fg_code']:<14} {f['product_name'][:42]:<42} -> {label} ({len(items)} parts)"
        if a.dry_run:
            print('[dry] ' + line)
            continue
        api.call('/bom', {'fg_id': int(f['id']), 'bom_name': f"{f['product_name']} - Demo BOM", 'version': 'V1',
                          'remarks': f'Demo {label} recipe', 'items': items})
        print(line)
    print('Done.' if not a.dry_run else 'Dry run only - nothing written.')


if __name__ == '__main__':
    main()
