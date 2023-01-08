#!/usr/bin/python3

import ulvl
import sys

if len(sys.argv) < 2:
    print("usage:", sys.argv[0], "<infiles>")
    sys.exit(1)

screenwidth, screenheight = 8, 8

tilemapping = { }

objmapping = { 6: [2, 0], 7: [3, 0], 8: [4, 0] }

print("var levels={")
for filename in sys.argv[1:]:
    m = ulvl.TMX.load(filename)

    w = m.meta['width']
    h = m.meta['height']

    print('\t', filename.replace('.tmx', '').replace('levels/', ''), end=': { ')

    print('dimension: ', w, ', ', end='')

    print('map: [', end='')
    for y in range(h):
        for x in range(w):
            thing = m.layers[0].tiles[y * w + x] - 1
            if thing > 0:
                os = objmapping.get(thing, [ thing - 1 ])
                for o in os:
                    print("{ x: ", x, ", y: ", y, ", id: ", o, "}, ", end='')
    print('] },');
print("}")
