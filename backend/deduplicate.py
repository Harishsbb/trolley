from pymongo import MongoClient
import os

MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb+srv://admin:harish123@cluster0.cfoj6si.mongodb.net/barcodedb?retryWrites=true&w=majority&appName=Cluster0'
DB_NAME = 'barcodedb'

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

print("Starting deduplication...")

# 1. Pipeline to find duplicates by name
pipeline = [
    {"$group": {
        "_id": "$product_name",
        "ids": {"$push": "$_id"},
        "count": {"$sum": 1},
        "total_qty": {"$sum": "$quantity"},
        "images": {"$push": "$image"},
        "prices": {"$push": "$product_price"}
    }},
    {"$match": {
        "count": {"$gt": 1}
    }}
]

duplicates = list(db.products.aggregate(pipeline))

for dup in duplicates:
    name = dup["_id"]
    ids = dup["ids"]
    total_qty = dup["total_qty"]
    
    # Pick the best image (first non-placeholder one)
    best_image = "/static/images/placeholder.svg"
    for img in dup["images"]:
        if img and "placeholder" not in img:
            best_image = img
            break
            
    # Pick the highest price found (assuming latest/correct)
    best_price = max(dup["prices"])

    print(f"Fixing '{name}': Merging {len(ids)} copies. Total Stock: {total_qty}")

    # Keep the first ID, remove others
    primary_id = ids[0]
    ids_to_remove = ids[1:]

    # Update primary
    db.products.update_one(
        {"_id": primary_id},
        {"$set": {
            "quantity": total_qty,
            "image": best_image,
            "product_price": best_price
        }}
    )

    # Delete others
    db.products.delete_many({"_id": {"$in": ids_to_remove}})

print("Deduplication complete! Refresh your dashboard.")
