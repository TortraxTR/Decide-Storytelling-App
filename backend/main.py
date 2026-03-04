import asyncio
from prisma import Prisma

async def main() -> None:
    db = Prisma()
    await db.connect()
    print("✅ Connection to 'decide_db' successful!")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())