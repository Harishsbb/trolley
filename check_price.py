from pymongo import MongoClient
import os

# Connect to MongoDB
MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb+srv://admin:harish123@cluster0.cfoj6si.mongodb.net/barcodedb?retryWrites=true&w=majority&appName=Cluster0'
client = MongoClient(MONGO_URI)
db = client['barcodedb']

# Search for Tiger Biscuit
query = "tiger"
print(f"Searching for '{query}'...")
products = list(db.products.find({"product_name": {"$regex": query, "$options": "i"}}))

if products:
    for p in products:
        print(f"Found: {p.get('product_name')} - Price: {p.get('product_price')} (Qty: {p.get('quantity')})")
else:
    print("Product not found.")
