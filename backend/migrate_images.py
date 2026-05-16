from pymongo import MongoClient
import os

client = MongoClient(os.environ.get('MONGO_URI', 'mongodb://localhost:27017/'))
db = client.barcodedb

IMG_MAP = {
    "1.jpeg": "lays.jpeg",
    "2.jpeg": "slice.jpeg",
    "3.jpeg": "tiger krunch.jpeg",
    "4.jpeg": "good day.jpeg",
    "5.jpeg": "tata salt.jpeg",
    "6.jpeg": "gold winner.jpeg",
    "7.jpeg": "dark fantasy.jpeg",
    "8.jpeg": "yippee noodles.jpeg",
    "9.jpeg": "colgate maxfresh.jpeg",
    "10.jpeg": "dabur honey.jpeg",
    "11.jpeg": "mysore sandal soap.jpeg",
    "12.jpg": "harpic.jpg",
    "13.jpg": "parachute oil.jpg",
    "14.jpg": "santoor soap.jpg",
    "15.jpg": "surf excel washing powder.jpg",
    "16.jpeg": "dettol.jpeg",
    "17.jpeg": "vanish.jpeg",
    "18.jpeg": "bourn vita.jpeg",
    "19.jpeg": "dabur red paste.jpeg",
    "20.jpg": "ariel matic liquid detergent.jpg",
    "21.jpeg": "oreo.jpeg",
    "22.jpeg": "boost.jpeg",
    "23.jpeg": "choco flakes.jpeg",
    "24.jpeg": "softouch fabric conditiner.jpeg",
    "25.jpg": "50 50 maska chaska.jpg"
}

products = list(db.products.find({}))
updated_count = 0

for p in products:
    curr_img = p.get('image', '')
    if not curr_img: continue
    
    filename = curr_img.split('/')[-1]
    if filename in IMG_MAP:
        new_filename = IMG_MAP[filename]
        new_path = f"/static/images/{new_filename}"
        db.products.update_one({'_id': p['_id']}, {'$set': {'image': new_path}})
        print(f"Updated '{p.get('product_name')}': {filename} -> {new_filename}")
        updated_count += 1

print(f"Total products updated: {updated_count}")
