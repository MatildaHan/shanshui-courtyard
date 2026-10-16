# Run concatenated after 00_common.py in Blender MCP. This stage is idempotent.
# Terrace: courses, exposed masonry joints, beveled profile suggested by steps.
box('column','stoneDark',(0,.24,0),(14,.48,10.2))
box('column','stone',(0,.60,0),(13.7,.24,10.0))
box('column','stoneDark',(0,.75,0),(13.45,.06,9.8))
box('column','stone',(0,.86,0),(13.2,.16,9.6))
for side in [-1,1]:
    for i in range(18):
        box('column','stone',(side*6.84,.36,-4.75+i*.55),(.05,.32,.52))
    for i in range(22):
        box('column','stone',(-6.55+i*.61,.35,side*5.05),(.58,.34,.06))
for i in range(6):
    top=.16+i*.145
    box('column','stone',(0,top*.5,6.13-i*.31),(4.9,top,.39))
    box('column','stoneDark',(0,top-.027,6.31-i*.31),(4.85,.035,.028))
# Tall framed timber columns, exposed carved beams and staggered bracket sets.
for x in [-5.6,-2.8,0,2.8,5.6]:
    for z in [-3.8,3.8]:
        column(x,z,1.04,2.66);dougong(x,4.12,z,.87)
for x in [-5.6,5.6]:
    for z in [-1.25,1.25]:
        column(x,z,1.04,2.66);dougong(x,4.12,z,.87)
for z in [-3.8,3.8]:
    for i in range(4):
        carved_beam((-5.6+i*2.8,0,z),(-2.8+i*2.8,0,z),4.02)
        dougong(-4.2+i*2.8,4.22,z,.56)
for x in [-5.6,5.6]: carved_beam((x,0,-3.8),(x,0,3.8),4.02)
# Floors and ceilings are explicitly partitioned around the staircase void.
box('column','woodLight',(0,.965,0),(11.0,.15,7.1))
for yy,th in [(3.94,.14),(5.555,.25)]:
    # Hole x 2.5..4.9, z -2.33..1.25 remains genuinely open.
    box('column','wood',(-1.2,yy,0),(7.4,th,6.7))
    box('column','wood',(3.7,yy,2.30),(2.4,th,2.10))
    box('column','wood',(3.7,yy,-2.84),(2.4,th,1.02))
# Thin plank seams are geometry, avoiding texture dependencies.
for i in range(29):
    xx=-5.35+i*.38
    box('column','wood',(xx,1.041,0),(.012,.005,6.95))
for i in range(26):
    xx=-4.80+i*.38
    if xx<2.5: box('column','woodLight',(xx,5.682,0),(.014,.005,6.55))
# Ground facade: entrance genuinely open, backing wall segmented around windows.
for x in [-4.2,1.4,4.2]:
    frame_window(x,2.50,3.46,2.12,2.60)
    box('window','wood',(x,1.20,3.44),(2.20,.30,.15))
for x in [-4.2,-1.4,1.4,4.2]:
    frame_window(x,2.50,-3.47,2.10,2.45,math.pi)
    box('window','wall',(x,1.30,-3.44),(2.70,.52,.16))
    box('window','wall',(x,3.79,-3.44),(2.70,.30,.16))
for side in [-1,1]:
    for zz,ww in [(-2.18,1.92),(0,1.92),(2.18,1.92)]:
        frame_window(side*5.43,2.51,zz,ww,2.40,side*math.pi*.5)
        box('window','wall',(side*5.42,1.30,zz),(.16,.52,2.12))
        box('window','wall',(side*5.42,3.79,zz),(.16,.30,2.12))
    for zz in [-3.35,-1.10,1.10,3.35]:
        box('window','red',(side*5.42,2.45,zz),(.19,2.82,.12))
# Door leaves folded against the inner room, away from the collision opening.
for side in [-1,1]:
    frame_window(-1.4+side*1.11,2.39,2.91,1.02,2.60,side*math.pi*.48,False)
    cyl('window','gold',-1.4+side*1.10,2.40,3.44,.055,.15,12)
# Upper storey and open balcony.
for x in [-4.15,-1.4,1.4,4.15]:
    for z in [-2.72,2.72]:
        column(x,z,5.68,2.10,radius=.158);dougong(x,8.19,z,.75)
for z in [-2.72,2.72]:
    carved_beam((-4.25,0,z),(4.25,0,z),8.11)
    for xx in [-2.77,0,2.77]:dougong(xx,8.29,z,.51)
for x in [-4.15,4.15]:carved_beam((x,0,-2.72),(x,0,2.72),8.11)
for x in [-2.75,2.75]:frame_window(x,6.94,2.42,2.30,2.12)
for x in [-2.75,0,2.75]:
    frame_window(x,6.94,-2.43,2.30,2.12,math.pi)
    box('window','wall',(x,5.86,-2.40),(2.52,.34,.14))
for side in [-1,1]:
    for zz in [-1.25,1.25]:frame_window(side*3.94,6.94,zz,1.96,2.12,side*math.pi*.5)
    box('window','wall',(side*3.93,5.86,0),(.14,.35,4.80))
    box('window','red',(side*3.93,6.96,0),(.18,2.50,.17))
for z in [-3.10,3.10]:rail((-4.70,0,z),(4.70,0,z),5.68)
for x in [-4.70,4.70]:rail((x,0,-3.10),(x,0,3.10),5.68)
# Ceiling above upper room, leaving the pitched roof interior readable.
for xx in [-2.75,0,2.75]:
    beam('column','wood',(xx,7.98,-2.30),(xx,7.98,2.30),.12,.18)
# Stair: open treads, risers, paired stringers and rails to the rear landing.
for i in range(25):
    zz=3-(i+.5)*.2; top=1.04+(i+1)*4.64/25
    box('window','woodLight',(3.35,top-.055,zz),(.96,.11,.235))
    box('window','red',(3.35,top-.145,zz+.098),(.96,.18,.036))
    box('window','goldDark',(3.35,top+.003,zz+.094),(.95,.012,.022))
    if i%3==0:
        for xx in [2.83,3.87]:box('window','red',(xx,top+.40,zz),(.055,.80,.055))
for xx in [2.83,3.87]:
    beam('window','wood',(xx,1.08,3),(xx,5.50,-2),.12,.15)
    tube('window','woodLight',[(xx,1.95,3.05),(xx,6.42,-1.94),(xx,6.48,-2.56)],.042,8)
box('window','woodLight',(3.35,5.615,-2.20),(.98,.13,.60))
rail((2.52,0,-2.28),(2.52,0,1.18),5.68,'window')
# Furniture with curved legs, apron rails, inset tabletop and blue-green ceramic.
def table(x,y,z,w,d,h):
    box('window','wood',(x,y+h,z),(w,.09,d))
    box('window','woodLight',(x,y+h+.048,z),(w-.12,.012,d-.12))
    for sx in [-1,1]:
        for sz in [-1,1]:
            xx=x+sx*(w*.5-.11);zz=z+sz*(d*.5-.10)
            tube('window','wood',[(xx+sx*.06,y,zz+sz*.03),(xx,y+h*.35,zz),(xx,y+h-.03,zz)],.047,8)
    for zz in [z-d*.5+.09,z+d*.5-.09]:
        curved_bracket(x,y+h-.18,zz,w-.18,'x','wood','window',.065)
table(-1.1,1.04,-.70,2,1.20,.68)
for xx in [-2.90,.70]:
    table(xx,1.04,-.70,.57,.62,.43)
    tube('window','wood',[(xx-.27,1.44,-.98),(xx-.27,2.08,-.98),(xx+.27,2.08,-.98),(xx+.27,1.44,-.98)],.035,8)
lathe('window','jade',-1.1,1.775,-.70,[(0,.10),(.04,.14),(.15,.14),(.19,.08),(.23,.08)],20)
for xx in [-1.50,-.70]:lathe('window','jade',xx,1.775,-.40,[(0,.055),(.07,.073),(.08,.077)],16)
for yy in [1.18,1.89,2.61]:box('window','wood',(-3.80,yy,-2.80),(2,.08,.56))
for xx in [-4.72,-2.88]:box('window','wood',(xx,1.95,-2.80),(.095,1.62,.56))
for i in range(8):box('window','red' if i%2 else 'linen',(-4.50+i*.19,2.11,-2.80),(.115,.35,.29))
table(-1,5.68,0,1.45,1.02,.47)
for zz in [-.95,.95]:table(-1,5.68,zz,.76,.46,.25)
lathe('window','jade',-1,6.20,0,[(0,.08),(.07,.12),(.16,.10),(.20,.05)],18)
# Solid carved screen in the rear-left interior, keeping the stair route free.
for xx in [-4.50,-3.70,-2.90]:frame_window(xx,2.13,-1.83,.72,1.78,0,False)
# Timber plaque: relief border and three non-text floral medallions, no bitmap.
box('window','ink',(-1.40,4.20,3.99),(2.13,.52,.12))
for yy in [3.96,4.44]:box('window','gold',(-1.40,yy,4.062),(2.08,.025,.018))
for xx in [-2.43,-.37]:box('window','gold',(xx,4.20,4.062),(.025,.49,.018))
for xx in [-2.03,-1.40,-.77]:
    pts=[(xx+.13*math.cos(t*math.tau/24),4.20+.13*math.sin(t*math.tau/24),4.075) for t in range(25)]
    tube('window','gold',pts,.016,5)
    for i in range(5):
        t=i*math.tau/5
        beam('window','gold',(xx,4.2,4.075),(xx+.11*math.cos(t),4.2+.11*math.sin(t),4.075),.025,.020)
flush('body')
ROOT['walkableFloorHeights']=[1.04,5.68]
ROOT['stairOpening']='x 2.5..4.9; z -2.33..1.25; both slabs open'
ROOT['interior']='two open doorways, 25 treads, upper landing, handrails, table/chairs/shelf/ceramics'
