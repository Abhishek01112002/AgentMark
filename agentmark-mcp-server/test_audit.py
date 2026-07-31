import asyncio
import sys
from agentmark_mcp.server import mcp

async def main():
    tools = await mcp.list_tools()
    print("Registered Tools:")
    for t in tools:
        print(f" - {t.name}")

if __name__ == "__main__":
    asyncio.run(main())
