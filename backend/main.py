from flask import Flask, render_template, request, jsonify, send_file, make_response, redirect, url_for, session
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import qrcode
from io import BytesIO
from werkzeug.security import generate_password_hash, check_password_hash
import re
from datetime import datetime
import os
import random

# --- Global State & Setup ---
app = Flask(__name__)
app.secret_key = 'your_super_secure_secret_key' # Use a strong key sessions
# CORS Setup: Must specify exact origins for credentials (cookies) to work
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "https://snapshop-web.vercel.app", "https://trolley-frontend-lemon.vercel.app", "https://trolley-frontend.vercel.app"])

# MongoDB configuration
MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb+srv://admin:harish123@cluster0.cfoj6si.mongodb.net/barcodedb?retryWrites=true&w=majority&appName=Cluster0'
DB_NAME = 'barcodedb'

# --- Utility Function for Database Connection ---
def get_db():
    try:
        client = MongoClient(MONGO_URI)
        return client[DB_NAME]
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "SnapShop API is running", "environment": "Vercel"})

# --- Cart Helper Functions ---
def get_cart_for_user():
    # ... logic using session or user_id ...
    # Note: Sessions across domains (Frontend on Vercel -> Backend on Vercel) require careful cookie settings (SameSite=None, Secure).
    # For simplicity, we might assume the frontend sends a custom header 'X-User-ID' or similar if cookies fail, 
    # but let's try standard session first.
    if 'username' not in session:
        return {'products': [], 'total_price': 0.0}
    
    db = get_db()
    if db is None: return {'products': [], 'total_price': 0.0}

    username = session['username']
    cart = db.carts.find_one({"username": username})
    
    if not cart:
         return {'products': [], 'total_price': 0.0}
    
    return cart

def update_cart_in_db(products, total_price):
    if 'username' not in session:
        return
    
    db = get_db()
    if db is None: return

    username = session['username']
    db.carts.update_one(
        {"username": username},
        {"$set": {"products": products, "total_price": total_price, "updated_at": datetime.now()}},
        upsert=True
    )


# --- Routes ---

@app.route('/scan-item', methods=['POST'])
def scan_item():
    """API endpoint to handle barcode scan from frontend."""
    if 'username' not in session:
        return jsonify({"status": "error", "message": "Not logged in"}), 401
        
    data = request.json
    barcode = data.get('barcode').strip()
    
    db = get_db()
    product = db.products.find_one({"barcodedata": barcode})
    
    if not product:
         return jsonify({"status": "error", "message": "Product not found"})
    
    try:
        # Get current cart
        cart = get_cart_for_user()
        current_products = cart.get('products', [])
        
        # Check if item exists in cart
        found = False
        for p in current_products:
            if p['name'] == product['product_name']:
                p['quantity'] += 1
                found = True
                break
                
        if not found:
            try:
                price = float(product['product_price'])
            except (ValueError, TypeError):
                print(f"Price conversion error for {product['product_name']}: {product['product_price']}")
                price = 0.0 # Fallback
                
            current_products.append({
                "name": product['product_name'],
                "price": price,
                "quantity": 1,
                "image": product.get('image', '/static/images/placeholder.svg')
            })
            
        # Recalculate total
        total_price = sum(float(p['price']) * int(p['quantity']) for p in current_products)
        
        # Save back to DB
        update_cart_in_db(current_products, total_price)
        
        return jsonify({
            "status": "success", 
            "product": product['product_name'],
            "cart": {
                "products": current_products,
                "total_prize": total_price
            }
        })
    except Exception as e:
        print(f"CRITICAL ERROR in scan_item: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/get-scanned-items', methods=['GET'])
def get_scanned_items():
    """Returns the user's cart."""
    cart = get_cart_for_user()
    return jsonify({"products": cart.get('products', []), "total_prize": cart.get('total_price', 0.0)})

@app.route('/remove-item', methods=['POST'])
def remove_item():
    if 'username' not in session: return jsonify({"status": "error"}), 401
    
    data = request.json
    product_name = data.get('product_name')
    
    try:
        cart = get_cart_for_user()
        current_products = cart.get('products', [])
        
        target_name = str(product_name).strip().lower() if product_name else ""

        # Filter out the item to remove (Robust case-insensitive comparison)
        new_products = [
            p for p in current_products 
            if str(p.get('name', '')).strip().lower() != target_name
        ]
        
        # Recalculate total safely
        total_price = 0.0
        for p in new_products:
            try:
                total_price += float(p.get('price', 0)) * int(p.get('quantity', 0))
            except (ValueError, TypeError):
                continue
        
        update_cart_in_db(new_products, total_price)
        
        return jsonify({
            "status": "success", 
            "message": "Item removed",
            "cart": {
                "products": new_products,
                "total_prize": total_price
            }
        })
    except Exception as e:
        print(f"Remove error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/start', methods=['POST'])
def start_scanning():
    # Only useful if we want to CLEAR the cart
    if 'username' in session:
         update_cart_in_db([], 0.0)
    return jsonify({"status": "Cart cleared"})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json() if request.is_json else request.form
    username = data.get('username')
    password = data.get('password')

    db = get_db()
    account = db.users.find_one({"username": username})

    if account and check_password_hash(account['password'], password):
        session['loggedin'] = True
        session['username'] = account['username']
        # Also store role if needed in session
        role = 'admin' if 'admin' in username.lower() else 'customer'
        session['role'] = role
        return jsonify({"status": "success", "username": username, "role": role})
    else:
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"status": "success", "message": "Logged out"})

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json() if request.is_json else request.form
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
        
    db = get_db()
    
    if db.users.find_one({"username": username}):
            return jsonify({"status": "error", "message": "User with this username already exists"}), 409
            
    hashed_password = generate_password_hash(password)
    db.users.insert_one({
        "username": username,
        "password": hashed_password,
        "email": email,
        "created_at": datetime.now()
    })
    
    return jsonify({"status": "success", "message": "User created successfully"})

# Stock/Sales Routines (kept relatively same)
@app.route('/api/stock')
def get_stock():
    db = get_db()
    products_cursor = db.products.find({})
    stock_data = []
    for p in products_cursor:
        p['_id'] = str(p['_id'])
        stock_data.append(p)
    return jsonify(stock_data)

@app.route('/api/product/edit', methods=['POST'])
def edit_product():
    if 'username' not in session: return jsonify({"status": "error", "message": "Unauthorized"}), 401
    
    data = request.json
    p_id = data.get('id')
    
    if not p_id:
        return jsonify({"status": "error", "message": "Product ID required"}), 400

    update_fields = {}
    if 'name' in data: update_fields['product_name'] = data['name']
    if 'price' in data: update_fields['product_price'] = data['price']
    if 'image' in data: update_fields['image'] = data['image']
    if 'barcode' in data: update_fields['barcodedata'] = data['barcode']
    if 'category' in data: update_fields['category'] = data['category']
    
    try:
        db = get_db()
        db.products.update_one({'_id': ObjectId(p_id)}, {'$set': update_fields})
        return jsonify({"status": "success", "message": "Product updated"})
    except Exception as e:
        print(f"Edit error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query', '').strip()
    db = get_db()
    if db is None: return jsonify([])

    # Fetch all products (for small dataset this is fine)
    # For scalable solutions, use MongoDB Atlas Search or text indexes
    all_products = list(db.products.find({}))
    
    if not query:
        # Return all products if query is empty (Gallery Mode)
        results = []
        seen_names = set()
        for p in all_products:
             raw_name = p.get('product_name', '')
             if not raw_name: continue
             norm_name = raw_name.strip()
             if norm_name not in seen_names:
                 results.append({
                        "id": str(p.get('_id')),
                        "name": raw_name,
                        "price": p.get('product_price'),
                        "image": p.get('image', '/static/images/placeholder.svg'),
                        "description": p.get('description', ''),
                        "location": p.get("location", ""),
                        "category": p.get("category", "")
                 })
                 seen_names.add(norm_name)
        return jsonify(results)

    query_lower = query.lower()
    scored_results = []
    seen_names = set()

    from difflib import SequenceMatcher

    for p in all_products:
        raw_name = p.get('product_name', '')
        if not raw_name: continue
        
        name_lower = raw_name.lower()
        
        # Calculate Match Score
        if name_lower == query_lower:
            score = 100 # Exact match
        elif name_lower.startswith(query_lower):
            score = 90 # Prefix match
        elif query_lower in name_lower:
            score = 80 # Substring match
        else:
            # Fuzzy match
            score = SequenceMatcher(None, query_lower, name_lower).ratio() * 100
        
        # Threshold for fuzzy: e.g., 50% similarity
        if score > 40:
            norm_name = raw_name.strip()
            if norm_name not in seen_names:
                scored_results.append({
                    "data": {
                        "id": str(p.get('_id')),
                        "name": raw_name,
                        "price": p.get('product_price'),
                        "image": p.get('image', '/static/images/placeholder.svg'),
                        "description": p.get('description', ''),
                        "location": p.get("location", ""),
                        "category": p.get("category", "")
                    },
                    "score": score
                })
                seen_names.add(norm_name)

    # Sort: Higher score first
    scored_results.sort(key=lambda x: x['score'], reverse=True)
    
    final_results = [item['data'] for item in scored_results]
    
    return jsonify(final_results)

@app.route('/recommended', methods=['GET'])
def recommended():
    db = get_db()
    if db is not None:
        pipeline = [{"$sample": {"size": 5}}]
        products_db = list(db.products.aggregate(pipeline))
        result = []
        for p in products_db:
             result.append({
                "name": p.get("product_name"),
                "price": p.get("product_price"),
                "image": p.get("image", "/static/images/placeholder.svg"),
                "category": p.get("category", "")
            })
        return jsonify(result)
    return jsonify([])

# --- Vercel requires app to be exported as 'app' or 'application' ---

@app.route('/api/product/add', methods=['POST'])
def add_product():
    if 'username' not in session: return jsonify({"status": "error", "message": "Unauthorized"}), 401
    
    data = request.json
    db = get_db()
    
    name = data.get('name')
    qty = int(data.get('quantity', 0))
    price = data.get('price')
    image = data.get('image_url')
    category = data.get('category')
    
    # Check if exists by Name (Case insensitive match could be better, but strict for now)
    existing = db.products.find_one({"product_name": name})
    
    if existing:
        # Update existing stock
        db.products.update_one(
            {"_id": existing["_id"]},
            {
                "$inc": {"quantity": qty},
                "$set": {
                    "product_price": price, # Update price to latest
                    "image": image if image else existing.get('image'), # Update image if provided
                    "category": category if category else existing.get('category')
                }
            }
        )
        return jsonify({"status": f"Updated stock for '{name}'. New Total: {existing['quantity'] + qty}"})

    # Create new
    new_product = {
        "barcodedata": data.get('barcode', str(random.randint(1000000000000, 9999999999999))), 
        "product_name": name,
        "product_price": price,
        "quantity": qty,
        "image": image or "/static/images/placeholder.svg",
        "category": category
    }
    
    db.products.insert_one(new_product)
    return jsonify({"status": "Product added successfully"})

@app.route('/api/product/update-stock', methods=['POST'])
def update_stock():
    if 'username' not in session: return jsonify({"status": "error", "message": "Unauthorized"}), 401
    
    data = request.json
    barcode = data.get('barcode')
    change = int(data.get('change', 0))
    
    db = get_db()
    
    # Update quantity securely without affecting other fields
    result = db.products.update_one(
        {"$or": [{"barcodedata": barcode}, {"product_name": barcode}]},
        {"$inc": {"quantity": change}}
    )
    
    if result.modified_count > 0:
         return jsonify({"status": "success", "message": "Stock updated"})
    else:
         return jsonify({"status": "error", "message": "Product not found"}), 404

@app.route('/api/product/remove', methods=['POST'])
def remove_product():
    if 'username' not in session: return jsonify({"status": "error", "message": "Unauthorized"}), 401
    
    data = request.json
    identifier = data.get('barcode') 
    
    db = get_db()
    # Try deleting by name OR barcode
    result = db.products.delete_one({
        "$or": [
            {"barcodedata": identifier},
            {"product_name": identifier}
        ]
    })
    
    if result.deleted_count > 0:
        return jsonify({"status": "Product removed successfully"})
    else:
        return jsonify({"status": "Product not found"})

if __name__ == '__main__':
    # usage_reloader=False prevents the "WinError 10038" socket error on Windows
    # by stopping the double-process spawner. You will need to manually restart
    # the server if you make code changes.
    app.run(debug=True, use_reloader=False, port=5003)
