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

# Updated Session Config for Cross-Site (Vercel Frontend -> Vercel Backend)
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True # Required for SameSite=None
# CORS Setup: Must specify exact origins for credentials (cookies) to work
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "https://snapshop-web.vercel.app", "https://trolley-frontend-lemon.vercel.app", "https://trolley-frontend.vercel.app"])

# MongoDB configuration
MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/barcodedb'
DB_NAME = 'barcodedb'

@app.after_request
def add_header(response):
    # Set Cache-Control for all JSON responses to prevent stale image data in frontend
    if response.content_type == 'application/json':
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return response

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
    return jsonify({"status": "SnapShop API is running", "environment": "Local"})

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

@app.route('/api/scan-item', methods=['POST'])
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
        # Fetch Special Offers from Database
        db = get_db()
        offers_cursor = db.offers.find({})
        DYNAMIC_OFFERS = {}
        for off in offers_cursor:
            # Map lowercase product name to offer details
            DYNAMIC_OFFERS[off['product_name'].lower()] = {
                "type": off.get('offer_type', 'pct'),
                "value": float(off.get('offer_value', 0))
            }

        # Calculate Applied Price
        original_price = float(product.get('product_price', 0))
        final_price = original_price
        applied_offer = None

        # Robust normalization: remove extra spaces and lowercase
        p_name_norm = " ".join(product['product_name'].lower().split())
        
        for key, offer in DYNAMIC_OFFERS.items():
            if key in p_name_norm:
                if offer['type'] == "pct":
                    final_price = original_price * (1 - offer['value'] / 100)
                elif offer['type'] == "flat":
                    final_price = max(0, original_price - offer['value'])
                applied_offer = key
                break

        # Get current cart
        cart = get_cart_for_user()
        current_products = cart.get('products', [])
        
        # Check if item exists in cart
        found = False
        for p in current_products:
            if p['name'] == product['product_name']:
                p['quantity'] += 1
                # Update price and offer status in case it was added before the offer was active
                p['price'] = final_price
                p['original_price'] = original_price
                p['on_offer'] = bool(applied_offer)
                found = True
                break
                
        if not found:
            current_products.append({
                "name": product['product_name'],
                "price": final_price,
                "original_price": original_price,
                "quantity": 1,
                "image": product.get('image', '/static/images/placeholder.svg'),
                "on_offer": bool(applied_offer)
            })
            
        # Recalculate total
        # Note: We use the already-discounted p['price']
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

@app.route('/api/get-scanned-items', methods=['GET'])
def get_scanned_items():
    """Returns the user's cart."""
    cart = get_cart_for_user()
    return jsonify({"products": cart.get('products', []), "total_prize": cart.get('total_price', 0.0)})

@app.route('/api/remove-item', methods=['POST'])
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

@app.route('/api/save-history', methods=['POST'])
def save_history():
    """Archives current cart into purchase_history and clears the cart."""
    if 'username' not in session:
        return jsonify({"status": "error", "message": "Not logged in"}), 401
    
    username = session['username']
    db = get_db()
    
    # 1. Get current cart
    cart = db.carts.find_one({"username": username})
    if not cart or not cart.get('products'):
        return jsonify({"status": "error", "message": "Cart is empty"}), 400
        
    # 2. Archive to history
    history_entry = {
        "username": username,
        "date": datetime.now(),
        "total_price": cart.get("total_price", 0.0),
        "items": cart.get("products", [])
    }
    
    try:
        db.purchase_history.insert_one(history_entry)
        
        # 3. Clear current cart
        db.carts.delete_one({"username": username})
        
        return jsonify({"status": "success", "message": "Purchase saved to history!"})
    except Exception as e:
        print(f"Error saving history: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/get-history', methods=['GET'])
def get_history():
    """Returns the user's purchase history."""
    if 'username' not in session:
        return jsonify({"status": "error"}), 401
        
    username = session['username']
    db = get_db()
    
    history_cursor = db.purchase_history.find({"username": username}).sort("date", -1)
    results = []
    for h in history_cursor:
        results.append({
            "id": str(h["_id"]),
            "date": h["date"].strftime("%Y-%m-%d %H:%M"),
            "total_price": h.get("total_price", 0.0),
            "item_count": len(h.get("items", [])),
            "items": h.get("items", [])
        })
    return jsonify(results)

@app.route('/api/start', methods=['POST'])
def start_scanning():
    # Only useful if we want to CLEAR the cart
    if 'username' in session:
         update_cart_in_db([], 0.0)
    return jsonify({"status": "Cart cleared"})

@app.route('/api/login', methods=['POST'])
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

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"status": "success", "message": "Logged out"})

@app.route('/api/register', methods=['POST'])
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
    if 'barcode_type' in data: update_fields['barcode_type'] = data['barcode_type']
    if 'category' in data: update_fields['category'] = data['category']
    
    try:
        db = get_db()
        db.products.update_one({'_id': ObjectId(p_id)}, {'$set': update_fields})
        return jsonify({"status": "success", "message": "Product updated"})
    except Exception as e:
        print(f"Edit error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/search', methods=['GET'])
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

@app.route('/api/recommended', methods=['GET'])
def recommended():
    db = get_db()
    if db is None: return jsonify([])

    username = session.get('username')
    
    # 1. Get current cart for exclusion
    cart = get_cart_for_user()
    scanned_names = [p['name'] for p in cart.get('products', [])]
    
    # 2. Analyze Full Purchase History
    from collections import Counter
    all_history_names = []
    
    if username:
        # Fetch all past purchases for this specific user
        history_cursor = db.purchase_history.find({"username": username})
        for entry in history_cursor:
            for item in entry.get('items', []):
                all_history_names.append(item.get('name', ''))
    
    # Calculate Frequency
    frequency_map = Counter(all_history_names)
    # Get top 10 most frequent items
    top_frequent = [item for item, count in frequency_map.most_common(10)]
    
    # Context for complementary suggestions
    context_text = " ".join(scanned_names + all_history_names).lower()
    
    # 3. Fetch all available products
    all_products = list(db.products.find({}))
    
    # 4. Filter Available Pool (Available & Not in cart)
    available_pool = [
        p for p in all_products 
        if p.get('product_name') not in scanned_names and int(p.get('quantity', 0)) > 0
    ]
    
    recommendations = []
    suggested_names = set()

    # --- Pass 1: "Because You Often Buy" (Frequency Based) ---
    for item_name in top_frequent:
        if len(recommendations) >= 4: break
        for p in available_pool:
            if p.get('product_name') == item_name and item_name not in suggested_names:
                recommendations.append({
                    "id": str(p.get("_id")),
                    "name": p.get("product_name"),
                    "price": p.get("product_price"),
                    "image": p.get("image", "/static/images/placeholder.svg"),
                    "category": p.get("category", ""),
                    "reason": "Top Choice" # Tag for UI if needed
                })
                suggested_names.add(item_name)
                break

    # --- Pass 2: Smart Complementary Logic (Heuristic Based) ---
    complementary_targets = []
    if any(k in context_text for k in ["toothpaste", "colgate", "oral-b"]):
        complementary_targets.extend(["Santoor Soap (Pack of 4)", "Dettol Liquid Hand Wash, 675ml", "Listerine Mouthwash"])
    if any(k in context_text for k in ["detergent", "conditioner", "ariel", "surf excel", "tide"]):
        complementary_targets.extend(["Vanish 800ml", "Harpic 1 Litre (pack of 2)", "Comfort Fabric Conditioner"])
    if any(k in context_text for k in ["boost", "bournvita", "horlicks", "milo", "drink", "powder"]):
        complementary_targets.extend(["Goodday Biscuit", "Dark fantasy choco fills", "Marie Gold Biscuit", "Oreo Cadbury Chocolately Flavour crème Sandwich Biscuit, 288.75 Gram"])
    if any(k in context_text for k in ["juice", "slice", "maaza", "paper boat", "coke", "pepsi", "sprite"]):
        complementary_targets.extend(["Lays Chips", "lays potato chips, classic, 8 oz", "Sunfeast yipee family pack", "Kurkure Masala Munch"])
    if any(k in context_text for k in ["oil", "ghee", "salt", "sugar", "atta", "rice"]):
        complementary_targets.extend(["Tata Salt 1kg", "Fortune Sunflower Oil", "Aashirvaad Atta 5kg", "India Gate Basmati Rice"])

    for target in complementary_targets:
        if len(recommendations) >= 8: break # Recommend up to 8 items for a nice grid
        for p in available_pool:
            if target.lower() in p.get('product_name', '').lower() and p.get('product_name') not in suggested_names:
                recommendations.append({
                    "id": str(p.get("_id")),
                    "name": p.get("product_name"),
                    "price": p.get("product_price"),
                    "image": p.get("image", "/static/images/placeholder.svg"),
                    "category": p.get("category", ""),
                    "reason": "Goes well with your picks"
                })
                suggested_names.add(p.get('product_name'))
                break

    # --- Pass 3: General Popularity / Discovery (Fillers) ---
    if len(recommendations) < 6:
        remaining_pool = [p for p in available_pool if p.get('product_name') not in suggested_names]
        random.shuffle(remaining_pool)
        for i in range(min(8 - len(recommendations), len(remaining_pool))):
            p = remaining_pool[i]
            recommendations.append({
                "id": str(p.get("_id")),
                "name": p.get("product_name"),
                "price": p.get("product_price"),
                "image": p.get("image", "/static/images/placeholder.svg"),
                "category": p.get("category", "")
            })

    # Return results
    return jsonify(recommendations)

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
        "category": category,
        "barcode_type": data.get('barcode_type', 'EAN_13')
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

@app.route('/api/get-offers', methods=['GET']) # Changed name for clarity or keep same
@app.route('/api/offers', methods=['GET'])
def get_offers():
    db = get_db()
    if db is None: return jsonify([])
    
    username = session.get('username')
    history_products = []
    if username:
        # Get all products ever bought by user for personalization
        history_cursor = db.purchase_history.find({"username": username}, {"items.name": 1})
        for h in history_cursor:
            for item in h.get('items', []):
                history_products.append(item.get('name', '').lower())

    offers_cursor = db.offers.find({})
    offers_data = []
    for o in offers_cursor:
        o['_id'] = str(o['_id'])
        
        # Tag as personalized if it's in their history
        prod_name = o.get('product_name', '').lower()
        if prod_name in history_products:
            o['personalized'] = True
            o['title'] = f"For You: {o.get('title', 'Special Offer')}"
            
        offers_data.append(o)
        
    # Sort: Personalized offers first
    offers_data.sort(key=lambda x: x.get('personalized', False), reverse=True)
    
    return jsonify(offers_data)

@app.route('/api/offer/add', methods=['POST'])
def add_offer():
    if 'username' not in session or session.get('role') != 'admin':
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    
    data = request.json
    db = get_db()
    
    image = data.get('image')
    product_name = data.get('product_name')

    # Auto-find image from product if not provided or placeholder
    if (not image or 'placeholder.svg' in image) and product_name:
        import re
        # Escape then make space more flexible
        escaped_name = re.escape(product_name).replace(r'\ ', '.*')
        prod = db.products.find_one({"product_name": {"$regex": f"^{escaped_name}", "$options": "i"}})
        
        if not prod:
            # Try splitting by commas/spaces for common prefix
            prefix = product_name.split(',')[0].split(' ')[0]
            prod = db.products.find_one({"product_name": {"$regex": f"{prefix}", "$options": "i"}})
            
        if prod and 'image' in prod:
            image = prod['image']
            if image.startswith('static/'): image = '/' + image

    new_offer = {
        "title": data.get('title'),
        "product_name": product_name,
        "image": image or 'https://placehold.co/400x400/f1f5f9/94a3b8.png?text=Offer',
        "discount_label": data.get('discount_label'),
        "tagline": data.get('tagline'),
        "color": data.get('color', '#6366f1'),
        "offer_type": data.get('offer_type', 'pct'),
        "offer_value": float(data.get('offer_value', 0))
    }
    
    db.offers.insert_one(new_offer)
    return jsonify({"status": "success", "message": "Offer added successfully"})

@app.route('/api/offer/edit', methods=['POST'])
def edit_offer():
    if 'username' not in session or session.get('role') != 'admin':
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    
    data = request.json
    o_id = data.get('id')
    
    if not o_id:
        return jsonify({"status": "error", "message": "Offer ID required"}), 400

    update_fields = {}
    if 'title' in data: update_fields['title'] = data['title']
    if 'product_name' in data: update_fields['product_name'] = data['product_name']
    
    # If image is cleared or looks like a placeholder, try auto-finding
    img = data.get('image', '').strip()
    p_name = data.get('product_name')
    
    if (not img or 'placeholder.svg' in img) and p_name:
        import re
        escaped_name = re.escape(p_name).replace(r'\ ', '.*')
        prod = db.products.find_one({"product_name": {"$regex": f"^{escaped_name}", "$options": "i"}})
        if prod and 'image' in prod:
            img = prod['image']
            if img.startswith('static/'): img = '/' + img
            
    if 'image' in data: update_fields['image'] = img
    if 'discount_label' in data: update_fields['discount_label'] = data['discount_label']
    if 'tagline' in data: update_fields['tagline'] = data['tagline']
    if 'color' in data: update_fields['color'] = data['color']
    if 'offer_type' in data: update_fields['offer_type'] = data['offer_type']
    if 'offer_value' in data: update_fields['offer_value'] = float(data.get('offer_value', 0))
    
    try:
        db = get_db()
        db.offers.update_one({'_id': ObjectId(o_id)}, {'$set': update_fields})
        return jsonify({"status": "success", "message": "Offer updated"})
    except Exception as e:
        print(f"Edit offer error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/offer/remove', methods=['POST'])
def remove_offer():
    if 'username' not in session or session.get('role') != 'admin':
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    
    data = request.json
    o_id = data.get('id')
    
    db = get_db()
    try:
        result = db.offers.delete_one({'_id': ObjectId(o_id)})
        if result.deleted_count > 0:
            return jsonify({"status": "success", "message": "Offer removed successfully"})
        else:
            return jsonify({"status": "error", "message": "Offer not found"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # usage_reloader=False prevents the "WinError 10038" socket error on Windows
    # by stopping the double-process spawner. You will need to manually restart
    # the server if you make code changes.
    app.run(debug=True, use_reloader=False, port=5003)
