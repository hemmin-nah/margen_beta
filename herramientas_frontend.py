from pathlib import Path
import shutil
r=Path(__file__).resolve().parent
for name in ('index.html','assets/margen.css','assets/margen.js','assets/margen-170.css','assets/margen-170.js','assets/margen-171.css','assets/margen-171.js','assets/margen-172.css','assets/margen-172.js','assets/margen-173.css','assets/margen-173.js','assets/margen-180.css','assets/margen-180.js','assets/margen-191.css','assets/margen-191.js','assets/margen-1101.css','assets/margen-110.js','assets/margen-111.css','assets/margen-111.js','assets/margen-112.css','assets/margen-112.js','assets/margen-121.css','assets/margen-121.js','assets/splash-171.svg'):
 src=r/'frontend'/name;dst=r/'dist'/name
 dst.parent.mkdir(parents=True,exist_ok=True)
 shutil.copyfile(src,dst)
print('Frontend actualizado en dist/')
