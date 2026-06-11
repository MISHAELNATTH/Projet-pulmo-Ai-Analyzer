from database import engine, SessionLocal, Base
from auth import get_password_hash
import models

def seed():
    # Drop and recreate all tables for a clean slate
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Create Admin user
        admin = models.User(
            email="admin@pneumoguard.com",
            hashed_password=get_password_hash("adminpass123"),
            first_name="System",
            last_name="Admin",
            role="admin"
        )
        
        # Create Radiologist user
        radiologist = models.User(
            email="radiologist@pneumoguard.com",
            hashed_password=get_password_hash("radiologistpass123"),
            first_name="Dr. Jane",
            last_name="Doe",
            role="radiologist"
        )
        
        # Create Auditor user
        auditor = models.User(
            email="auditor@pneumoguard.com",
            hashed_password=get_password_hash("auditorpass123"),
            first_name="Compliance",
            last_name="Officer",
            role="auditor"
        )
        
        db.add_all([admin, radiologist, auditor])
        db.commit()
        print("SQLite Database initialized successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
