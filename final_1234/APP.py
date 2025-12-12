# from flask import Flask, render_template, request, redirect, url_for, session, flash
# import mysql.connector
# from werkzeug.security import generate_password_hash, check_password_hash
# import re
# from datetime import datetime

# app = Flask(__name__)
# app.secret_key = 'your_secret_key'

# # Configure MySQL connection
# db = mysql.connector.connect(
#     host="localhost",
#     user="root",
#     password="Harish@2006",
#     database="barcodeDB"
# )
# cursor = db.cursor()

# # Root route
# @app.route('/')
# def index():
#     if 'loggedin' in session:
#         return redirect(url_for('home'))
#     else:
#         return redirect(url_for('login'))

# # Register route
# @app.route('/register', methods=['GET', 'POST'])
# def register():
#     if request.method == 'POST':
#         username = request.form['username']
#         password = request.form['password']
#         email = request.form['email']

#         # Hash the password
#         hashed_password = generate_password_hash(password)

#         # Validate the email
#         if not re.match(r'[^@]+@[^@]+\.[^@]+', email):
#             flash('Invalid email address.')
#         else:
#             # Check if the user already exists
#             cursor.execute('SELECT * FROM users WHERE username = %s OR email = %s', (username, email))
#             account = cursor.fetchone()

#             if account:
#                 flash('Account with this username or email already exists.')
#             else:
#                 # Insert user into the database
#                 cursor.execute('INSERT INTO users (username, password, email, created_at) VALUES (%s, %s, %s, %s)',
#                                (username, hashed_password, email, datetime.now()))
#                 db.commit()
#                 flash('You have successfully registered!')
#                 return redirect(url_for('login'))

#     return render_template('register.html')

# # Login route
# @app.route('/login', methods=['GET', 'POST'])
# def login():
#     if request.method == 'POST':
#         username = request.form['username']
#         password = request.form['password']

#         cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
#         account = cursor.fetchone()

#         if account and check_password_hash(account[2], password):
#             session['loggedin'] = True
#             session['username'] = account[1]
#             flash('Login successful!')
#             return redirect(url_for('home'))
#         else:
#             flash('Invalid credentials, please try again.')

#     return render_template('login.html')

# # Home route (protected)
# @app.route('/home')
# def home():
#     if 'loggedin' in session:
#         return render_template('home1.html', username=session['username'])
#     return redirect(url_for('login'))

# # Logout route
# @app.route('/logout', methods=['POST'])
# def logout():
#     session.pop('loggedin', None)
#     session.pop('username', None)
#     flash('You have successfully logged out.')
#     return redirect(url_for('login'))


# if __name__ == '__main__':
#     app.run(debug=True)