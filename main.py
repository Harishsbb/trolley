from flask import Flask, render_template, request, jsonify, send_file, make_response, redirect, url_for, session, flash
from pymongo import MongoClient, DESCENDING
from bson import ObjectId
import threading
import pygame
import cv2
from pyzbar.pyzbar import decode
import time
import pyttsx3
import qrcode
from io import BytesIO
from werkzeug.security import generate_password_hash, check_password_hash
import re
from datetime import datetime
import os
import random

# --- Global State & Setup ---
app = Flask(__name__)
app.secret_key = 'your_super_secure_secret_key' # Use a strong key for sessions

# Global state for the current scanning session (Cart)
products = []
total_prize = 0.0 # Initialized as float for consistency

# Lock to protect the global 'products' and 'total_prize' from race conditions
lock = threading.Lock()

# Flag for controlling the scanning thread
scanning = False 
last_scan_time = 0
last_barcode = None

# MongoDB configuration
MONGO_URI = 'mongodb+srv://admin:harish123@cluster0.cfoj6si.mongodb.net/barcodedb?retryWrites=true&w=majority&appName=Cluster0'
DB_NAME = 'barcodedb'

# Initialize Pygame Mixer for sounds (using user's sound paths/names)
try:
    pygame.mixer.init()
    # Note: These files must exist in the root directory for the app to run
    BEEP_SOUND = pygame.mixer.Sound("beep-02.mp3")
    SUCCESS_SOUND = pygame.mixer.Sound("success.mp3")
    THANK_YOU_SOUND = pygame.mixer.Sound("thankyou.mp3")
    WEL_SOUND = pygame.mixer.Sound("welcome.mp3")
except pygame.error as e:
    print(f"Warning: Pygame initialization failed or sound files missing: {e}")
    class DummySound:
        def play(self):
            pass
    BEEP_SOUND = DummySound()
    SUCCESS_SOUND = DummySound()
    THANK_YOU_SOUND = DummySound()
    WEL_SOUND = DummySound()

# --- GLOBAL TTS INITIALIZATION (STABILITY FIX) ---
try:
    TTS_ENGINE = pyttsx3.init()
except Exception as e:
    print(f"Warning: pyttsx3 initialization failed: {e}")
    class DummyEngine:
        def say(self, text): pass
        def runAndWait(self): pass
    TTS_ENGINE = DummyEngine()
# -------------------------------------------------

# Sample product data with locations and corrected image paths (Static fallback)
products12 = {
    "Snacks": [
        {"id": 1, "name": "Lays Potato Chips","price": 10.00 ,"location": "Row 1-Sector 1", "image": "/static/images/1.jpeg", "description": "Delicious potato chips."},
        {"id": 2, "name": "Slice 1.75 L","price": 93.00 ,"location": "Row 1-Sector 2", "image": "/static/images/2.jpeg", "description": "Refreshing beverage."},
        {"id": 3, "name": "Tiger Biscuit","price":10.00 , "location": "Row 1-Sector 3", "image": "/static/images/3.jpeg", "description": "Crunchy and tasty biscuits."},
        {"id": 4, "name": "Good Day Biscuit","price":10.00 , "location": "Row 1-Sector 4", "image": "/static/images/4.jpeg", "description": "Sweet and buttery biscuits."},
        {"id": 7, "name": "DARK FANTASY CHOCO FILLS LUXURIA","price":128.00 , "location": "Row 2-Sector 2", "image": "/static/images/7.jpeg", "description": "Delicious chocolate-filled cookies."},
        {"id": 8, "name": "Sunfeast YiPPee Family Pack", "price":153.00 ,"location": "Row 2-Sector 3", "image": "/static/images/8.jpeg", "description": "Tasty noodles for the whole family."},
        {"id": 21, "name": "Oreo Cadbury Chocolatey Biscuit","price":87.00 , "location": "Row 5-Sector 1", "image": "/static/images/21.jpeg", "description": "Delicious chocolate sandwich biscuits."},
        {"id": 23, "name": "Kwality Choco Flakes 1kg","price":229.00 , "location": "Row 5-Sector 3", "image": "/static/images/23.jpeg", "description": "Tasty choco flakes for breakfast."},
        {"id": 25, "name": "Britannia 50-50, Maska Chaska","price":28.00 , "location": "Row 5-Sector 5", "image": "/static/images/25.jpg", "description": "Crunchy biscuits with a tasty maska chaska."}
    ],
    "Daily Use Products": [
        
        {"id": 5, "name": "Tata Salt 1kg", "price":25.00 ,"location": "Row 1-Sector 5", "image": "/static/images/5.jpeg", "description": "Essential cooking salt."},
        {"id": 6, "name": "Gold Winner Sunflower Oil 1L","price":190.00 , "location": "Row 2-Sector 1", "image": "/static/images/6.jpeg", "description": "High-quality sunflower oil."},
        {"id": 9, "name": "Colgate MaxFresh Toothpaste","price":72.00 , "location": "Row 2-Sector 4", "image": "/static/images/9.jpeg", "description": "Fresh breath toothpaste."},
        {"id": 10, "name": "Dabur Honey - 1kg","price":391.00 ,"location": "Row 2-Sector 5", "image": "/static/images/10.jpeg", "description": "Pure and natural honey."},
        {"id": 11, "name": "Mysore Sandal Soap, 450g","price":232.00 , "location": "Row 3-Sector 1", "image": "/static/images/11.jpeg", "description": "Luxurious sandalwood soap."},
        {"id": 12, "name": "Harpic 1 Litre (Pack of 2)","price":396.00 , "location": "Row 3-Sector 2", "image": "/static/images/12.jpg", "description": "Effective toilet cleaner."},
        {"id": 13, "name": "Parachute Coconut Oil","price":126.00 , "location": "Row 3-Sector 3", "image": "/static/images/13.jpg", "description": "Pure coconut oil for cooking and skin."},
        {"id": 14, "name": "Santoor Soap (Pack of 4)","price":163.00 , "location": "Row 3-Sector 4", "image": "/static/images/14.jpg", "description": "Gentle and moisturizing soap."},
        {"id": 15, "name": "Surf Excel Easy Wash Detergent Powder - 5 Kg","price":650.00 , "location": "Row 3-Sector 5", "image": "/static/images/15.jpg", "description": "Powerful stain removal detergent."},
        {"id": 16, "name": "Dettol Liquid Hand Wash, 675ml","price":92.00 , "location": "Row 4-Sector 1", "image": "/static/images/16.jpeg", "description": "Antibacterial hand wash."},
        {"id": 17, "name": "Vanish 800ml","price":199.00 , "location": "Row 4-Sector 2", "image": "/static/images/17.jpeg", "description": "Stain remover for clothes."},
        {"id": 18, "name": "Cadbury Bournvita Chocolate Nutrition Drink, 2 kg","price":697.00 , "location": "Row 4-Sector 3", "image": "/static/images/18.jpeg", "description": "Chocolate drink for energy."},
        {"id": 19, "name": "Dabur Red Toothpaste - 800g (200gx4)","price":330.00 , "location": "Row 4-Sector 4", "image": "/static/images/19.jpeg", "description": "Ayurvedic toothpaste for oral care."},
        {"id": 20, "name": "Ariel Matic Liquid Detergent 3.2 Ltr","price":479.00 , "location": "Row 4-Sector 5", "image": "/static/images/20.jpg", "description": "Liquid detergent for washing machines."},
        {"id": 22, "name": "BOOST Chocolate Nutrition Drink Powder 750g","price":380.00 , "location": "Row 5-Sector 2", "image": "/static/images/22.jpeg", "description": "Chocolate drink powder for energy."},
        {"id": 24, "name": "Softouch 2X French Perfume 2L Fabric Conditioner","price":345.00 , "location": "Row 5-Sector 4", "image": "/static/images/24.jpeg", "description": "Fabric conditioner with a French fragrance."},

    ]
}

# --- Utility Function for Database Connection ---
def get_db():
    """Returns the MongoDB database object."""
    try:
        client = MongoClient(MONGO_URI)
        return client[DB_NAME]
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# --- Dashboard & General API Endpoints ---
@app.route('/sales_data')
def sales_data():
    try:
        db = get_db()
        pipeline = [
            {"$group": {"_id": "$product_name", "total_sold": {"$sum": "$quantity"}}},
            {"$sort": {"total_sold": -1}},
            {"$limit": 5},
            {"$project": {"product_name": "$_id", "total_sold": 1, "_id": 0}}
        ]
        data = list(db.purchase_history.aggregate(pipeline))
        return jsonify(data)
    except Exception as e:
        print("Error fetching sales data:", e)
        return jsonify({"error": "Failed to fetch sales data"}), 500


# Example: last purchased product stored in session
# You can fetch from DB instead
# Route to get shuffled recommended products
@app.route('/recommended', methods=['GET'])
def recommended():
    # Attempt to fetch recommended products from DB first if available, else fallback
    db = get_db()
    if db:
        try:
             # Randomly sample 5 products
            pipeline = [{"$sample": {"size": 5}}]
            products_db = list(db.products.aggregate(pipeline))
            if products_db:
                # Format for frontend
                result = []
                for p in products_db:
                    result.append({
                        "name": p.get("product_name"),
                        "price": p.get("product_price"),
                        "image": p.get("image", "/static/images/placeholder.svg")
                    })
                return jsonify(result)
        except Exception as e:
            print(f"Error fetching recommended from DB: {e}")
    
    # Fallback to static list
    recommended_list = []
    # Pick random 3 products from Snacks and Daily Use
    for category in products12:
        recommended_list.extend(random.sample(products12[category], min(2, len(products12[category]))))

    # Shuffle final recommended list
    random.shuffle(recommended_list)

    # Return only 5 items max
    return jsonify(recommended_list[:5])

# Add recommended product to scanned list
@app.route('/add-recommended', methods=['POST'])
def add_recommended():
    data = request.json
    product_name = data.get('product_name')
    product_price = data.get('product_price', 0)
    
    global products, total_prize
    
    lock.acquire()
    try:
        # Check if product is already in the list
        existing_product = next((p for p in products if p["name"] == product_name), None)
        if existing_product:
            existing_product["quantity"] += 1
        else:
            products.append({"name": product_name, "price": product_price, "quantity": 1})
        
        total_prize = sum(p['price'] * p['quantity'] for p in products)
    finally:
        lock.release()
    
    return jsonify({"products": products, "total_prize": total_prize, "status": f"{product_name} added!"})
# -------
@app.route('/api/stock')
def get_stock():
    """Fetches all product stock data."""
    db = get_db()
    if db is None:
        return jsonify({'error': 'Database unavailable'}), 500
    try:
        # Fetch all products, exclude _id for JSON serialization unless converted
        stock_data = list(db.products.find({}, {'_id': 0}))
        return jsonify(stock_data)
    except Exception as e:
        print("Error in /api/stock:", e)
        return jsonify({'error': 'Failed to fetch stock data'}), 500

@app.route('/api/sales')
def get_sales():
    """Fetches top sales data for charting."""
    db = get_db()
    if db is None:
        return jsonify({'error': 'Database unavailable'}), 500
    try:
        pipeline = [
            {"$group": {
                "_id": "$product_name", 
                "total_quantity": {"$sum": "$quantity"},
                "total_revenue": {"$sum": { "$multiply": [ "$quantity", "$product_price" ] }} 
            }},
            {"$sort": {"total_quantity": -1}},
            {"$limit": 10},
            {"$project": {
                "product_name": "$_id", 
                "total_quantity": 1, 
                "total_revenue": 1, 
                "_id": 0
            }}
        ]
        sales_data = list(db.purchase_history.aggregate(pipeline)) # Assuming purchase_history stores sales
        return jsonify(sales_data)
    except Exception as e:
        print("Error in /api/sales:", e)
        return jsonify({'error': 'Failed to fetch sales data'}), 500

@app.route('/api/product/add', methods=['POST'])
def add_product():
    """Adds a new product from the Dashboard Form."""
    data = request.get_json()
    barcode = data.get('barcode')
    name = data.get('name')
    price = data.get('price')
    image_url = data.get('image_url') or 'https://placehold.co/100x100?text=No+Image'
    quantity = data.get('quantity', 0)

    db = get_db()
    if db is None:
        return jsonify({'status': 'Database unavailable'}), 500

    try:
        # Basic validation
        if not barcode or not name:
             return jsonify({'status': 'Missing barcode or product name'}), 400
             
        # Insert into MongoDB
        db.products.insert_one({
            "barcodedata": barcode,
            "product_name": name,
            "product_price": float(price),
            "image": image_url,
            "quantity": int(quantity)
        })
        return jsonify({'status': 'Product added successfully'})
    except Exception as e:
        print("Error in /api/product/add:", e)
        return jsonify({'status': 'Failed to add product'}), 500

@app.route('/api/product/remove', methods=['POST'])
def remove_product_api():
    """Removes a product completely (from stock) via API."""
    data = request.get_json()
    barcode = data.get('barcode')

    db = get_db()
    if db is None:
        return jsonify({'status': 'Database unavailable'}), 500

    try:
        result = db.products.delete_one({"barcodedata": barcode})
        if result.deleted_count > 0:
            return jsonify({'status': 'Product removed successfully'})
        else:
            return jsonify({'status': 'Product not found'})
    except Exception as e:
        print("Error in /api/product/remove:", e)
        return jsonify({'status': 'Failed to remove product'}), 500


# --- General Web Routes (Login/Register/Home) ---

@app.route('/')
def home():
    """Redirects to home_page if logged in, otherwise to login."""
    if 'loggedin' in session:
        return redirect(url_for('home_page'))
    else:
        return redirect(url_for('login'))

@app.route('/shop_dashboard')
def shop_dashboard():
    """Renders the Shop Keeper Dashboard."""
    if 'loggedin' in session:
        return render_template('shop_dashboard.html')
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Handles user registration for the web interface."""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email')
        
        db = get_db()
        if db is None:
             flash('Database unavailable for registration.')
             return render_template('register.html')
             
        hashed_password = generate_password_hash(password)

        if not re.match(r'[^@]+@[^@]+\.[^@]+', email):
            flash('Invalid email address.')
        else:
            account = db.users.find_one({"$or": [{"username": username}, {"email": email}]})

            if account:
                flash('Account with this username or email already exists.')
            else:
                db.users.insert_one({
                    "username": username,
                    "password": hashed_password,
                    "email": email,
                    "created_at": datetime.now()
                })
                flash('You have successfully registered!')
                return redirect(url_for('login'))
        
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handles user login."""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        db = get_db()
        if db is None:
            return render_template('login.html', error='Database unavailable')

        account = db.users.find_one({"username": username})

        if account and check_password_hash(account['password'], password):
            session['loggedin'] = True
            session['username'] = account['username']
            flash('Login successful!')
            return redirect(url_for('home_page'))
        else:
            flash('Invalid credentials, please try again.')

    return render_template('login.html')

@app.route('/home')
def home_page():
    """Renders the home page for logged-in users."""
    if 'loggedin' in session:
        return render_template('home.html', username=session['username'])
    return redirect(url_for('login'))

@app.route('/logout', methods=['POST'])
def logout():
    """Logs the user out."""
    session.pop('loggedin', None)
    session.pop('username', None)
    flash('You have successfully logged out.')
    return redirect(url_for('login'))

@app.route('/scanner')
def index():
    """Renders the barcode scanner page."""
    return render_template('index.html')

@app.route('/searchproduct')
def searchf():
    """Renders the product gallery/search page."""
    return render_template('gallery.html', products=products12)

@app.route('/product/<int:product_id>')
def product_details(product_id):
    """Renders the details for a specific product and its shelf location."""
    # This still uses the dictionary fallback logic because the dictionary has 'location' and 'description'
    # which might not be in the minimal Mongo schema yet. 
    # If possible, we should fetch from DB. 
    product = next((p for category in products12.values() for p in category if p['id'] == product_id), None)
    if product is None:
        return render_template('404.html'), 404
    return render_template('shelves.html', product=product)

@app.route('/search', methods=['GET'])
def search():
    """Performs a product search and returns results as JSON."""
    query = request.args.get('query', '')
    
    # Combined search: check DB first, then fallback to internal list if needed or merge
    db = get_db()
    results = []
    
    if db:
        try:
             # Basic regex search in DB
            db_products = list(db.products.find({"product_name": {"$regex": query, "$options": "i"}}))
            for p in db_products:
                results.append({
                    "id": str(p.get('_id')), # Convert ObjectId if needed, or use barcode as ID
                    "name": p.get('product_name'),
                    "price": p.get('product_price'),
                    "image": p.get('image', '/static/images/placeholder.svg'),
                    "description": p.get('description', 'No description available'),
                    "location": p.get("location", "Unknown") 
                })
        except Exception as e:
            print(f"Search DB error: {e}")

    # Also search in the hardcoded list (legacy support)
    static_results = [product for category in products12.values() for product in category if query.lower() in product['name'].lower()]
    
    # Merge results (simple append, deduplication is better but expensive for simple app)
    # Give DB results priority
    final_results = results + static_results
    
    return jsonify(final_results)

@app.route('/register-scanner', methods=['POST'])
def register_scanner_user():
    """Registers a user's details (phone, name, address) for the scanner flow."""
    data = request.json
    phone_number = data.get('phone_number')
    name = data.get('name')
    address = data.get('address')
    
    db = get_db()
    if db is None:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        # Upsert user based on phone number
        result = db.users.update_one(
            {"phone_number": phone_number},
            {"$set": {"name": name, "address": address}},
            upsert=True
        )
        
        # Get user (ObjectId)
        user = db.users.find_one({"phone_number": phone_number})
        user_id = str(user['_id'])

        return jsonify({"status": "User registered", "user_id": user_id})
    except Exception as e:
        print(f"Mongo Error in register_scanner_user: {e}")
        return jsonify({"status": "error", "message": f"Database error: {e}"}), 500

@app.route('/user-details', methods=['GET'])
def get_user_details():
    """Retrieves user details by user_id."""
    user_id = request.args.get('user_id')
    
    db = get_db()
    if db is None:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if user:
            response = {
                "phone_number": user.get('phone_number'),
                "name": user.get('name'),
                "address": user.get('address')
            }
        else:
            response = {"status": "User not found"}

        return jsonify(response)
    except Exception as e:
        print(f"Error in get_user_details: {e}")
        return jsonify({"status": "error", "message": "Failed to fetch details"}), 500

# --- Helper Function for Non-Blocking TTS and Sound ---
def speak_and_play_thankyou(final_total_prize):
    """Runs TTS and thank you sound in a non-blocking way."""
    if final_total_prize > 0:
        # NOTE: runAndWait() is what causes the delay, but it's required for the speech to complete.
        # Running it in this separate thread ensures the main scanning thread can terminate quickly.
        TTS_ENGINE.say(f"Total price is {final_total_prize} rupees") 
        TTS_ENGINE.runAndWait()
        THANK_YOU_SOUND.play()
# ----------------------------------------------------

# --- Scanner Logic (Threaded) ---

def barcode_scanner(user_id, delay):
    """
    Runs the barcode scanning process in a separate thread.
    Uses threading.Lock to safely update global cart state.
    """
    global scanning, products, total_prize, last_barcode, last_scan_time, lock
    
    db = get_db()
    if db is None:
        print("CRITICAL: Barcode scanner cannot connect to database.")
        scanning = False
        return

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    WEL_SOUND.play()
    
    try:
        while scanning:
            ret, frame = cap.read()
            if not ret:
                continue

            barcodes = decode(frame)
            for barcode in barcodes:
                barcode_data = barcode.data.decode("utf-8")
                now = time.time()

                # Prevent duplicate scans within the delay period
                if barcode_data == last_barcode and (now - last_scan_time) < delay:
                    continue

                last_barcode = barcode_data
                last_scan_time = now

                (x, y, w, h) = barcode.rect
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                BEEP_SOUND.play()
                
                # --- DIAGNOSTIC: Log the incoming barcode ---
                print(f"Scanner read barcode: {barcode_data}")
                
                # Retrieve product from MongoDB
                product = db.products.find_one({"barcodedata": barcode_data})

                if product:
                    product_name = product['product_name']
                    product_price = float(product['product_price'])
                    
                    lock.acquire()
                    try:
                        # Check if product is already in the list
                        existing_product = next((p for p in products if p["name"] == product_name), None)
                        if existing_product:
                            existing_product["quantity"] += 1
                        else:
                            products.append({"name": product_name, "price": product_price, "quantity": 1})
                            
                        total_prize += product_price # This is now safe as both are floats
                        print(f"Scanned: {product_name}. Cart updated. Scanning continues...") # <-- DIAGNOSTIC LOG
                    finally:
                        lock.release()

                    SUCCESS_SOUND.play()
                else:
                    # --- DIAGNOSTIC: Log item not found in DB ---
                    print(f"Product with barcode {barcode_data} NOT found in database.")

            cv2.imshow('Barcode Scanner', frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        print("Barcode scanner loop exited normally.") # <-- DIAGNOSTIC LOG

        # Actions after scanning stops
        # 1. Acquire lock only to read the final total_prize value for TTS
        final_total_prize = 0
        lock.acquire()
        try:
            final_total_prize = total_prize
        finally:
            lock.release()
            
        # 2. FIX: Run the blocking TTS/Sound logic in a separate, disposable thread
        if final_total_prize > 0:
            threading.Thread(target=speak_and_play_thankyou, args=(final_total_prize,)).start()
            
    except Exception as thread_e: # <-- ADDED EXCEPTION HANDLING
        print(f"CRITICAL ERROR in barcode_scanner thread: {thread_e}")
        # When an error occurs, we set the global flag to stop the loop
        scanning = False 
    
    finally:
        # Camera cleanup MUST happen in the same thread, so we still wait for it here.
        cap.release()
        cv2.destroyAllWindows()
        print("Camera resources released.") # <-- DIAGNOSTIC LOG

# --- Cart Management API Endpoints (All now use threading.Lock) ---

@app.route('/start', methods=['POST'])
def start_scanning():
    """Starts a NEW scanning session and initializes/resets the cart."""
    data = request.json
    user_id = data.get('user_id')
    delay = data.get('delay', 1.5) # Increased delay for better stability

    global scanning, products, total_prize, lock
    
    if not scanning:
        # --- FIX: Explicitly reset cart ONLY when starting a fresh session ---
        lock.acquire()
        try:
            products.clear()
            total_prize = 0.0
        finally:
            lock.release()
        # -------------------------------------------------------------------
        
        scanning = True
        threading.Thread(target=barcode_scanner, args=(user_id, delay)).start()
        return jsonify({"status": "Scanning started", "reset": True})
    else:
        return jsonify({"status": "Scanning already in progress", "reset": False})

@app.route('/stop', methods=['POST'])
def stop_scanning():
    """Stops the barcode scanning thread and returns the final cart."""
    global scanning
    scanning = False

    lock.acquire()
    try:
        final_data = {"products": products, "total_prize": total_prize}
    finally:
        lock.release()

    return jsonify({"status": "Scanning stopped", **final_data})

@app.route('/remove', methods=['POST'])
def remove_item():
    """
    Removes a product from the current cart.
    """
    global products, total_prize
    product_name = request.json.get('product_name')
    status = "Item not found in cart"
    
    lock.acquire()
    try:
        product_to_remove = None
        for product in products:
            if product['name'] == product_name:
                product_to_remove = product
                break
        
        if product_to_remove:
            # Calculate the total price of the item being removed
            price_reduction = product_to_remove['price'] * product_to_remove['quantity']
            total_prize -= price_reduction
            
            # Remove the product from the list
            products.remove(product_to_remove)
            
            status = f"Removed all units of {product_name}"
            BEEP_SOUND.play()
            
        return jsonify({"status": status, "products": products, "total_prize": total_prize})
    
    except Exception as e:
        status = f"Error during removal: {e}"
        return jsonify({"status": status, "products": products, "total_prize": total_prize}), 500
    
    finally:
        lock.release()

@app.route('/change-quantity', methods=['POST'])
def change_quantity():
    """
    Updates the quantity of a product in the current cart with locking.
    """
    global products, total_prize

    product_name = request.json.get('product_name')
    new_quantity = request.json.get('quantity')

    try:
        new_quantity = int(new_quantity)
    except ValueError:
        return jsonify({"status": "Invalid quantity provided"}), 400

    if new_quantity < 0:
        return jsonify({"status": "Quantity cannot be negative"}), 400

    lock.acquire()
    try:
        found = False
        for product in products:
            if product['name'] == product_name:
                found = True
                
                # 1. Calculate the original total price for this product
                original_total = product['price'] * product['quantity']
                
                if new_quantity > 0:
                    # 2. Update the product quantity
                    product['quantity'] = new_quantity
                    
                    # 3. Calculate the new total price for this product
                    new_total = product['price'] * new_quantity
                    
                    # 4. Update the global total prize by adding the difference
                    total_prize += (new_total - original_total)
                    status = f"Quantity of {product_name} changed to {new_quantity}"
                else:
                    # Remove item if quantity is zero
                    total_prize -= original_total
                    products.remove(product)
                    status = f"Removed {product_name} as quantity was set to zero."
                
                break
        
        if not found:
             status = f"Product '{product_name}' not found in cart."
             
        return jsonify({"status": status, "products": products, "total_prize": total_prize})

    except Exception as e:
        status = f"Error changing quantity: {e}"
        return jsonify({"status": status, "products": products, "total_prize": total_prize}), 500
        
    finally:
        lock.release()

@app.route('/qr', methods=['GET'])
def generate_qr_code():
    """Generates a QR code image for UPI payment based on the current total prize."""
    lock.acquire()
    try:
        amount = max(0.01, total_prize) 
    finally:
        lock.release()
        
    payment_url = f"upi://pay?pa=bavaharishkumar-2@okicici&pn=VS STORES&am={amount:.2f}&cu=INR&mode=02"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(payment_url)
    qr.make(fit=True)

    img = qr.make_image(fill='black', back_color='white')

    img_io = BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)

    return send_file(img_io, mimetype='image/png')

@app.route('/get-scanned-items', methods=['GET'])
def get_scanned_items():
    """Returns the current list of scanned products and the total prize."""
    global products, total_prize
    
    lock.acquire()
    try:
        response = {"products": products, "total_prize": total_prize}
    finally:
        lock.release()
        
    return jsonify(response)

@app.route('/add-more', methods=['POST'])
def add_more():
    """Resumes scanning if it was stopped. Does NOT reset the cart."""
    global scanning
    if not scanning:
        data = request.json
        user_id = data.get('user_id')
        # Use the delay set in the /start route for consistency
        delay = data.get('delay', 1.5) 
        scanning = True
        threading.Thread(target=barcode_scanner, args=(user_id, delay)).start()
        return jsonify({"status": "Scanning resumed", "reset": False})
    else:
        return jsonify({"status": "Scanning already in progress"})

@app.route('/generate-bill', methods=['GET'])
def generate_bill():
    """Generates the final bill HTML page."""
    global products, total_prize

    lock.acquire()
    try:
        current_products = products[:] # Copy the list
        current_total = total_prize
    finally:
        lock.release()

    bill_html = render_template('bill.html', products=current_products, total_prize=current_total)
    response = make_response(bill_html)
    response.headers['Content-Type'] = 'text/html'
    return response

# --- Main Execution ---

if __name__ == '__main__':
    # Ensure you have the 'barcodeDB' database and necessary tables (users, products, sales) configured
    print("\n--- Starting Flask App with MongoDB ---")
    print("WARNING: Please ensure MongoDB is running on localhost:27017.")
    print("A threading.Lock has been implemented for safety on global cart state (products, total_prize).")
    
    app.run(debug=True)
