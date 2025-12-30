
from pymongo import MongoClient
import os

MONGO_URI = 'mongodb+srv://admin:harish123@cluster0.cfoj6si.mongodb.net/barcodedb?retryWrites=true&w=majority&appName=Cluster0'
DB_NAME = 'barcodedb'

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    cursor = db.products.find({}, {'product_name': 1, '_id': 0})
    
    with open('product_names_utf8.txt', 'w', encoding='utf-8') as f:
        f.write("Product Names:\n")
        for doc in cursor:
            f.write(f"- {doc.get('product_name', 'Unknown')}\n")

except Exception as e:
    print(f"Error: {e}")
