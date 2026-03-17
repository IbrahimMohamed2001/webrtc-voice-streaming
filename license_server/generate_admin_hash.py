#!/usr/bin/env python3
"""
Generate bcrypt password hash for admin user.
Usage: python generate_admin_hash.py
"""

from passlib.context import CryptContext
import getpass

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

print("=== Admin Password Hash Generator ===\n")
email = input("Admin Email: ").strip()
password = getpass.getpass("Admin Password: ")
confirm = getpass.getpass("Confirm Password: ")

if password != confirm:
    print("ERROR: Passwords don't match!")
    exit(1)

if len(password) < 8:
    print("ERROR: Password must be at least 8 characters!")
    exit(1)

hash_value = pwd_context.hash(password)

print("\n=== Add these to your .env file ===")
print(f"ADMIN_EMAIL={email}")
print(f"ADMIN_PASSWORD_HASH={hash_value}")
print("\nKeep this hash secure!")
