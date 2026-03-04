import asyncio
from prisma import Prisma

# Initialize Prisma client
db = Prisma()

async def seed_database():
    await db.connect()

    try:
        print("Starting database seeding...")

        # Create sample users
        print("\nCreating users...")
        user1 = await db.user.create(
            data={
                "email": "author1@decide.com",
                "username": "storyteller_alice",
            }
        )
        user2 = await db.user.create(
            data={
                "email": "author2@decide.com",
                "username": "storyteller_bob",
            }
        )
        user3 = await db.user.create(
            data={
                "email": "reader1@decide.com",
                "username": "reader_charlie",
            }
        )
        print(f"Created 3 users")

        # Create authors and readers
        print("\nCreating authors and readers...")
        author1 = await db.author.create(
            data={
                "userId": user1.id,
                "bio": "A passionate storyteller exploring interactive narratives.",
            }
        )
        author2 = await db.author.create(
            data={
                "userId": user2.id,
                "bio": "Creating branching stories for the modern reader.",
            }
        )
        reader1 = await db.reader.create(data={"userId": user3.id})
        print(f"Created 2 authors and 1 reader")

        # Create stories
        print("\nCreating stories...")
        story1 = await db.story.create(
            data={
                "title": "The Lost City",
                "description": "An adventure through ancient ruins and forgotten civilizations.",
                "thumbnail": "https://example.com/lost-city.jpg",
                "authorId": author1.id,
            }
        )
        story2 = await db.story.create(
            data={
                "title": "Quantum Leap",
                "description": "A sci-fi tale about time travel and alternate realities.",
                "thumbnail": "https://example.com/quantum-leap.jpg",
                "authorId": author2.id,
            }
        )
        print(f"Created 2 stories")

        # Create episodes
        print("\nCreating episodes...")
        episode1_1 = await db.episode.create(
            data={
                "storyId": story1.id,
                "title": "The Discovery",
                "description": "Our hero discovers an old map in their grandmother's attic.",
                "thumbnail": "https://example.com/discovery.jpg",
                "order": 0,
            }
        )
        episode1_2 = await db.episode.create(
            data={
                "storyId": story1.id,
                "title": "The Journey Begins",
                "description": "Setting out on an expedition to find the lost city.",
                "thumbnail": "https://example.com/journey.jpg",
                "order": 1,
            }
        )
        print(f"Created 2 episodes")

        # Create episode nodes
        print("\nCreating episode nodes...")
        node1_1_1 = await db.episodenode.create(
            data={
                "episodeId": episode1_1.id,
                "contentUrl": "https://example.com/content/intro.html",
                "isStart": True,
                "isEnd": False,
            }
        )
        node1_1_2 = await db.episodenode.create(
            data={
                "episodeId": episode1_1.id,
                "contentUrl": "https://example.com/content/chamber.html",
                "isStart": False,
                "isEnd": False,
            }
        )
        node1_1_3 = await db.episodenode.create(
            data={
                "episodeId": episode1_1.id,
                "contentUrl": "https://example.com/content/ending.html",
                "isStart": False,
                "isEnd": True,
            }
        )

        node1_2_1 = await db.episodenode.create(
            data={
                "episodeId": episode1_2.id,
                "contentUrl": "https://example.com/content/journey-start.html",
                "isStart": True,
                "isEnd": False,
            }
        )
        node1_2_2 = await db.episodenode.create(
            data={
                "episodeId": episode1_2.id,
                "contentUrl": "https://example.com/content/forest.html",
                "isStart": False,
                "isEnd": False,
            }
        )
        node1_2_3 = await db.episodenode.create(
            data={
                "episodeId": episode1_2.id,
                "contentUrl": "https://example.com/content/ruins.html",
                "isStart": False,
                "isEnd": True,
            }
        )
        print(f"Created 6 episode nodes")

        # Create decisions
        print("\nCreating decisions...")
        decision1_1 = await db.decision.create(
            data={
                "text": "Follow the map to the coordinates",
                "sourceNodeId": node1_1_1.id,
                "targetNodeId": node1_1_2.id,
            }
        )
        decision1_2 = await db.decision.create(
            data={
                "text": "Ignore the map and explore the chamber",
                "sourceNodeId": node1_1_1.id,
                "targetNodeId": node1_1_3.id,
            }
        )
        decision1_3 = await db.decision.create(
            data={
                "text": "Continue on the path",
                "sourceNodeId": node1_1_2.id,
                "targetNodeId": node1_1_3.id,
            }
        )

        decision2_1 = await db.decision.create(
            data={
                "text": "Head through the dense forest",
                "sourceNodeId": node1_2_1.id,
                "targetNodeId": node1_2_2.id,
            }
        )
        decision2_2 = await db.decision.create(
            data={
                "text": "Take the mountain pass",
                "sourceNodeId": node1_2_1.id,
                "targetNodeId": node1_2_3.id,
            }
        )
        decision2_3 = await db.decision.create(
            data={
                "text": "Venture deeper into the ruins",
                "sourceNodeId": node1_2_2.id,
                "targetNodeId": node1_2_3.id,
            }
        )
        print(f"Created 6 decisions")

        print("\nDatabase seeding completed successfully!")
        print("\nSummary:")
        print("  Users: 3")
        print("  Authors: 2")
        print("  Readers: 1")
        print("  Stories: 2")
        print("  Episodes: 2")
        print("  Episode Nodes: 6")
        print("  Decisions: 6")

    except Exception as e:
        print(f"\nError during seeding: {e}")
        raise

    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(seed_database())