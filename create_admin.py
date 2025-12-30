from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from datetime import datetime
import os

# Connect to MongoDB
MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb+srv://admin:harish123@cluster0.cfoj6si.mongodb.net/barcodedb?retryWrites=true&w=majority&appName=Cluster0'
DB_NAME = 'barcodedb'

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    username = "admin"
    password = "admin123"
    email = "admin@snapshop.com"
    
    # Check if exists
    if db.users.find_one({"username": username}):
        print("User 'admin' already exists. Updating password...")
        db.users.update_one(
            {"username": username},
            {"$set": {"password": generate_password_hash(password)}}
        )
    else:
        print("Creating new admin user...")
        db.users.insert_one({
            "username": username,
            "password": generate_password_hash(password),
            "email": email,
            "created_at": datetime.now()
        })
        
    print(f"Success! Login credentials:\nUsername: {username}\nPassword: {password}")

except Exception as e:
    print(f"Error: {e}")
