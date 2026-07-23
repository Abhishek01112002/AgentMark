with open("logs/ai_service.log", "r", encoding="utf-8") as f:
    lines = f.readlines()
    last_lines = lines[-150:]
    for line in last_lines:
        ascii_line = line.encode('ascii', errors='replace').decode('ascii')
        print(ascii_line.strip())
