from pymongo import MongoClient
import os
import pprint

MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb+srv://admin:harish123@cluster0.cfoj6si.mongodb.net/barcodedb?retryWrites=true&w=majority&appName=Cluster0'
client = MongoClient(MONGO_URI)
db = client['barcodedb']

print("--- Searching for Brownie/browne ---")
items = list(db.products.find({"product_name": {"$regex": "brown", "$options": "i"}}))
for item in items:
    print(f"Name: '{item.get('product_name')}'")
    print(f"Barcode: '{item.get('barcodedata')}' (Type: {type(item.get('barcodedata'))})")
    print(f"ID: {item.get('_id')}")
    print("-" * 20)

print("\n--- Searching for Barcode 5601069106907 ---")
b_items = list(db.products.find({"barcodedata": "5601069106907"}))
print(f"Found {len(b_items)} matches for exact barcode string.")
for item in b_items:
    print(f"Match: {item.get('product_name')} - {item.get('barcodedata')}")
