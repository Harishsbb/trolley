from pymongo import MongoClient
import os

# Connect to MongoDB
MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb+srv://admin:harish123@cluster0.cfoj6si.mongodb.net/barcodedb?retryWrites=true&w=majority&appName=Cluster0'
client = MongoClient(MONGO_URI)
db = client['barcodedb']

# Find incorrect product
incorrect_barcode = '56010069106907'
correct_barcode = '5601069106907'

# Fix by name "browne" or by the incorrect barcode
result = db.products.update_one(
    {"product_name": "browne"},
    {"$set": {
        "barcodedata": correct_barcode,
        "product_name": "Brownie"
    }}
)

if result.modified_count > 0:
    print("Successfully corrected 'browne' to 'Brownie' and fixed barcode.")
else:
    print("Product not found or already correct.")
    # check if it exists with another name
    p = db.products.find_one({"barcodedata": incorrect_barcode})
    if p:
         print(f"Found it with name {p['product_name']}, fixing...")
         db.products.update_one(
             {"_id": p["_id"]},
             {"$set": {"barcodedata": correct_barcode, "product_name": "Brownie"}}
         )
         print("Fixed.")
