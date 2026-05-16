from pymongo import MongoClient
import os

MONGO_URI = 'mongodb+srv://admin:harish123@cluster0.cfoj6si.mongodb.net/barcodedb?retryWrites=true&w=majority&appName=Cluster0'
DB_NAME = 'barcodedb'

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    result = db.products.update_many({}, {"$set": {"quantity": 100}})
    print(f"Updated {result.modified_count} products with quantity 100.")
except Exception as e:
    print(f"Error: {e}")
