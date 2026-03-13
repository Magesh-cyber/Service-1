import sqlite3
import bcrypt

def create_user(email, password, full_name, role):
    conn = sqlite3.connect('egov.db')
    cursor = conn.cursor()
    
    # Simple bcrypt hash
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        cursor.execute("UPDATE users SET password_hash = ?, full_name = ?, role = ?, failed_attempts = 0, lock_until = NULL WHERE email = ?", 
                      (password_hash, full_name, role, email))
        print(f"Updated and reset user: {email}")
    else:
        cursor.execute("INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)",
                      (full_name, email, password_hash, role))
        print(f"Created user: {email}")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    create_user("citizen@example.com", "password123", "Alex Fischer", "citizen")
    create_user("admin@cybershield.gov", "admin123", "Super Admin", "admin")
    create_user("clerk@cybershield.gov", "clerk123", "Clerk Officer", "clerk")
    create_user("manager@cybershield.gov", "manager123", "Senior Manager", "manager")
