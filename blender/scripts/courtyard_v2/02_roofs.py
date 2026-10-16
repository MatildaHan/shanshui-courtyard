# Main two-storey roof; execute common + this file after the body stage.
main_tiles=roof_geometry(7.5,5.3,2.70,4.82,'roof',hole=.50)
main_tiles+=roof_geometry(6.1,4.45,3.00,8.85,'roof')
# Four lower eave tips receive rising sculpted finials, outside walkable rooms.
for sx in [-1,1]:
    for sz in [-1,1]:
        pts=[]
        for i in range(20):
            t=i/19
            pts.append((sx*(7.46+.28*t),5.71+.72*t*t,sz*(5.26+.20*t)))
        tube('roof','goldDark',pts,.057,8,radii=[.095-.055*i/19 for i in range(20)])
        for k in range(4):
            t=.16+k*.16
            beam('roof','gold',(sx*(7.46+.28*t),5.71+.72*t*t,sz*(5.26+.2*t)),(sx*(7.42+.20*t),5.90+.72*t*t,sz*(5.23+.15*t)),.036,.045)
        # Bird-like roof guardian silhouette on each hip, formed from turned solids.
        lathe('roof','tile1',sx*6.89,5.45,sz*4.84,[(0,.10),(.09,.13),(.22,.085),(.29,.055)],10)
        tube('roof','goldDark',[(sx*6.89,5.70,sz*4.84),(sx*6.98,5.83,sz*4.86),(sx*7.07,5.82,sz*4.88)],.044,7)
flush('roof')
ROOT['mainTileCount']=main_tiles
ROOT['tileCount']=main_tiles+ROOT.get('corridorTileCount',0)
ROOT['roofConstruction']='two curved xieshan roofs; overlapping solid barrel tile shells; end discs; rafters; hip ridges; gable trusses; chiwen finials'
print('MAIN_ROOF_TILES',main_tiles)
