import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

dbName = os.getenv("DB_NAME")
dbHost = os.getenv("DB_HOST")
dbPort = os.getenv("DB_PORT")
dbPassword = os.getenv("DB_PASSWORD")
dbDialect = os.getenv("DB_DIALECT")
dbUser = os.getenv("DB_USER")

databaseUrl = f"{dbDialect}://{dbUser}:{dbPassword}@{dbHost}:{dbPort}/{dbName}"

engine = create_engine(databaseUrl)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
