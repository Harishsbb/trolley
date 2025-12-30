import requests
import os

# Ensure directory exists
os.makedirs("d:/snapshop/static/images", exist_ok=True)

# Mapping of file to (Approximate Real URL, Product Name)
images = {
    "1.jpeg": ("https://m.media-amazon.com/images/I/81Xm+QoXNLL._SL1500_.jpg", "Lays"),
    "2.jpeg": ("https://m.media-amazon.com/images/I/61HzsH-a52L._AC_SL1500_.jpg", "Maaza"),
    "3.jpeg": ("https://m.media-amazon.com/images/I/71t-Y2K6eCL._SL1500_.jpg", "Tiger Biscuit"),
    "4.jpeg": ("https://m.media-amazon.com/images/I/71w-2-M1VFL._SL1000_.jpg", "Good Day"),
    "5.jpeg": ("https://m.media-amazon.com/images/I/61C+W-c+u+L._SL1000_.jpg", "Tata Salt"),
    "6.jpeg": ("https://m.media-amazon.com/images/I/61n+1+a+tJL._SL1000_.jpg", "Gold Winner"),
    "7.jpeg": ("https://m.media-amazon.com/images/I/71Xt+A+tJL._SL1500_.jpg", "Dark Fantasy"),
    "8.jpeg": ("https://m.media-amazon.com/images/I/81z+1+a+tJL._SL1500_.jpg", "Yippee"),
    "9.jpeg": ("https://m.media-amazon.com/images/I/61b7B+a+tJL._SL1500_.jpg", "Colgate"),
    "10.jpeg": ("https://m.media-amazon.com/images/I/61Z+1+a+tJL._SL1500_.jpg", "Dabur Honey"),
    "11.jpeg": ("https://m.media-amazon.com/images/I/61Y+1+a+tJL._SL1500_.jpg", "Sandal Soap"),
    "12.jpg": ("https://m.media-amazon.com/images/I/61W+1+a+tJL._SL1500_.jpg", "Harpic"),
    "13.jpg": ("https://m.media-amazon.com/images/I/51p+1+a+tJL._SL1000_.jpg", "Parachute"),
    "14.jpg": ("https://m.media-amazon.com/images/I/61R+1+a+tJL._SL1500_.jpg", "Santoor"),
    "23.jpeg": ("https://m.media-amazon.com/images/I/71+1+a+tJL._SL1500_.jpg", "Kelloggs"),
    "24.jpeg": ("https://m.media-amazon.com/images/I/61+1+a+tJL._SL1500_.jpg", "Softouch"),
    "25.jpg": ("https://m.media-amazon.com/images/I/61q+1+a+tJL._SL1500_.jpg", "50-50"),
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

for filename, (url, name) in images.items():
    path = f"d:/snapshop/static/images/{filename}"
    try:
        print(f"Downloading {name} to {filename}...")
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            with open(path, 'wb') as f:
                f.write(response.content)
            print("Success")
        else:
            print(f"Failed to download real image for {name}, creating placeholder.")
            raise Exception("Download failed")
            
    except Exception as e:
        # Fallback to Text Placeholder
        print(f"Error: {e}. Using fallback.")
        try:
            fallback_url = f"https://placehold.co/400x400/e2e8f0/1e293b.png?text={name}"
            r = requests.get(fallback_url, timeout=5)
            with open(path, 'wb') as f:
                f.write(r.content)
        except:
            print("Fallback failed too.")
