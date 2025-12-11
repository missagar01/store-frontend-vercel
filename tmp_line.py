from pathlib import Path  
lines = Path('src/components/views/PendingIndents.tsx').read_text().splitlines()  
for idx, line in enumerate(lines, 1):  
